// components/ReservationFormModal.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    ScrollView,
    Easing,
    TextInput,
} from "react-native";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useReservations } from "../context/ReservationsContext";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export function ReservationFormModal({ visible, onClose }: Props) {
    const { addReservation } = useReservations();

    // 애니메이션
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const boxOpacity = useRef(new Animated.Value(0)).current;

    // 입력 필드
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [time, setTime] = useState(""); // HHmm

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const dateStr = date.toISOString().slice(0, 10);

    /* ------------------- 시간 자동 포맷 ------------------- */
    function formatTimeInput(input: string) {
        const digits = input.replace(/\D/g, "").slice(0, 4);
        if (digits.length < 4) return digits;
        return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }

    // 유효성 검사
    const isTimeValid = (() => {
        const t = time.replace(":", "");
        if (!/^[0-9]{4}$/.test(t)) return false;
        const hh = Number(t.slice(0, 2));
        const mm = Number(t.slice(2));
        return hh >= 0 && hh < 24 && mm >= 0 && mm < 60;
    })();

    const formattedTime = isTimeValid ? time : "";

    const canSubmit =
        name.trim() &&
        phone.trim() &&
        from.trim() &&
        to.trim() &&
        isTimeValid;

    /* ------------------- Reset ------------------- */
    const resetForm = () => {
        setName("");
        setPhone("");
        setFrom("");
        setTo("");
        setTime("");
        setDate(new Date());
    };

    /* ------------------- Modal Animation ------------------- */
    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            slideAnim.setValue(40);
            boxOpacity.setValue(0);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 6,
                    tension: 60,
                    useNativeDriver: true,
                }),
                Animated.timing(boxOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const closeWithAnimation = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 40,
                duration: 180,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(boxOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            resetForm();
            onClose();
        });
    };

    /* ------------------- Date Picker ------------------- */
    const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === "set" && selected) setDate(selected);
        setShowDatePicker(false);
    };

    /* ------------------- Submit ------------------- */
    const handleConfirm = async () => {
        await addReservation({
            name: name.trim(),
            phone: phone.trim(),
            from: from.trim(),
            to: to.trim(),
            date: dateStr,
            time: formattedTime, // HH:mm
            notes: "",
        });

        closeWithAnimation();
    };

    /* ------------------- Phone Format ------------------- */
    function formatPhone(raw: string) {
        const digits = raw.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />

            <View style={styles.centerWrap}>
                <Animated.View
                    style={[
                        styles.modalBox,
                        { transform: [{ translateY: slideAnim }], opacity: boxOpacity },
                    ]}
                >
                    <ScrollView>
                        <Text style={styles.title}>예약 등록</Text>

                        {/* 이름 */}
                        <Text style={styles.label}>예약자 이름</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="이름"
                        />

                        {/* 전화번호 */}
                        <Text style={styles.label}>전화번호</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={(t) => setPhone(formatPhone(t))}
                            placeholder="010-0000-0000"
                            keyboardType="phone-pad"
                        />

                        {/* 출발지 */}
                        <Text style={styles.label}>출발지</Text>
                        <TextInput
                            style={styles.input}
                            value={from}
                            onChangeText={setFrom}
                            placeholder="출발지"
                        />

                        {/* 도착지 */}
                        <Text style={styles.label}>도착지</Text>
                        <TextInput
                            style={styles.input}
                            value={to}
                            onChangeText={setTo}
                            placeholder="도착지"
                        />

                        {/* 날짜 */}
                        <Text style={styles.label}>출발 날짜</Text>
                        <Pressable
                            style={[styles.input, styles.dateBox]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text>{dateStr}</Text>
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="calendar"
                                onChange={handleDateChange}
                                minimumDate={today}
                            />
                        )}

                        {/* 시간 */}
                        <Text style={styles.label}>출발 시간 (HHmm)</Text>
                        <TextInput
                            style={styles.input}
                            value={time}
                            keyboardType="number-pad"
                            maxLength={5}
                            placeholder="예: 0930"
                            onChangeText={(t) => setTime(formatTimeInput(t))}
                        />

                        {/* 버튼 */}
                        <View style={styles.buttons}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={closeWithAnimation}
                            >
                                <Text style={styles.cancelText}>취소</Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.confirmButton,
                                    !canSubmit && { opacity: 0.5 },
                                ]}
                                onPress={canSubmit ? handleConfirm : undefined}
                            >
                                <Text style={styles.confirmText}>등록</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

/* ------------------- STYLES ------------------- */
const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    centerWrap: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        width: "90%",
        maxHeight: "85%",
        backgroundColor: "white",
        padding: 20,
        borderRadius: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 12,
    },
    label: {
        marginTop: 8,
        marginBottom: 4,
        fontWeight: "600",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    },
    dateBox: {
        justifyContent: "center",
        minHeight: 40,
    },
    buttons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#e0e0e0",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelText: {
        color: "#333",
        fontWeight: "600",
    },
    confirmButton: {
        flex: 1,
        backgroundColor: "#007AFF",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    confirmText: {
        color: "white",
        fontWeight: "600",
    },
});
