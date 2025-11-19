// components/ReservationByDateModal.tsx
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    ScrollView,
    Easing,
} from "react-native";
import { Reservation } from "../types/reservation";
import { ReservationCard } from "./ReservationCard";
import { useRouter } from "expo-router";

interface Props {
    visible: boolean;
    date: string | null;         // YYYY-MM-DD
    reservations: Reservation[];
    onClose: () => void;
}

export function ReservationByDateModal({
    visible,
    date,
    reservations,
    onClose,
}: Props) {
    const router = useRouter();

    // 애니메이션
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const boxOpacity = useRef(new Animated.Value(0)).current;

    // 🔥 A. 시간 오름차순 정렬 적용
    const list = reservations
        .filter((r) => r.date === date)
        .sort((a, b) => {
            const t1 = a.time ?? "00:00";
            const t2 = b.time ?? "00:00";
            return t1.localeCompare(t2);
        });

    // 열릴 때 애니메이션
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
        ]).start(onClose);
    };

    return (
        <Modal visible={visible} transparent animationType="none">
            {/* 어두운 배경 */}
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />

            {/* 중앙 정렬된 모달 */}
            <View style={styles.centerContainer}>
                <Animated.View
                    style={[
                        styles.modalBox,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: boxOpacity,
                        },
                    ]}
                >
                    <Text style={styles.title}>{date} 예약 목록</Text>

                    {/* 리스트 */}
                    <ScrollView style={styles.scrollArea}>
                        {list.length === 0 ? (
                            <Text style={styles.emptyText}>예약이 없습니다.</Text>
                        ) : (
                            list.map((r) => (
                                <ReservationCard
                                    key={r.id}
                                    reservation={r}
                                    onPress={() => {
                                        closeWithAnimation();
                                        router.push({
                                            pathname: "/reservation/[id]",
                                            params: { id: r.id },
                                        });
                                    }}
                                />
                            ))
                        )}
                    </ScrollView>

                    {/* 닫기 */}
                    <Pressable style={styles.closeButton} onPress={closeWithAnimation}>
                        <Text style={styles.closeText}>닫기</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

/* ------------------ Styles ------------------ */

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalBox: {
        width: "90%",
        height: "70%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
    scrollArea: {
        flex: 1,
        marginBottom: 12,
    },
    emptyText: {
        marginTop: 10,
        textAlign: "center",
        color: "#666",
    },
    closeButton: {
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: "#eee",
        borderRadius: 20,
    },
    closeText: {
        fontWeight: "600",
    },
});
