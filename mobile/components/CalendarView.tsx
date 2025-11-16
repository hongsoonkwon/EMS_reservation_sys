import { Calendar, DateObject } from "react-native-calendars";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Reservation } from "../types/reservation";
import { useMemo } from "react";

interface Props {
    reservations: Reservation[];
    keyword?: string;
    onSelectDate: (date: string) => void;
}

export function CalendarView({ reservations, keyword, onSelectDate }: Props) {

    // 1️⃣ 날짜별 예약 여부를 계산
    const marked = useMemo(() => {
        const dict: Record<string, any> = {};

        reservations.forEach((r) => {
            // 검색어 있을 때: 해당 이름/전화번호 포함하는 예약만 활성화
            if (keyword) {
                const k = keyword.trim();
                const match = r.name.includes(k) || r.phone.includes(k);
                if (match) {
                    dict[r.date] = {
                        marked: true,
                        dotColor: "#007AFF",
                        selectedColor: "#007AFF",
                        selected: true,
                    };
                }
            } else {
                // 검색어 없을 때: 예약이 존재하는 날짜만 표시
                dict[r.date] = {
                    marked: true,
                    dotColor: "#007AFF",
                };
            }
        });

        return dict;
    }, [reservations, keyword]);

    return (
        <View style={styles.calendarWrapper}>
            <Calendar
                markedDates={marked}   // ⬅ 이제 정상 동작!
                onDayPress={(day: DateObject) => onSelectDate(day.dateString)}
                dayComponent={({ date, state }) => {
                    const disabled = !marked[date.dateString];

                    return (
                        <Pressable
                            disabled={disabled}
                            onPress={() => onSelectDate(date.dateString)}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: disabled ? 0.3 : 1,
                            }}
                        >
                            <Text
                                style={{
                                    color: disabled
                                        ? "#ccc"
                                        : state === "today"
                                            ? "#007AFF"
                                            : "#111",
                                    fontWeight: disabled ? "400" : "600",
                                }}
                            >
                                {date.day}
                            </Text>
                        </Pressable>
                    );
                }}

                theme={{
                    todayTextColor: "#007AFF",
                    arrowColor: "#007AFF",
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    calendarWrapper: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        marginTop: 12,

        // 그림자 효과
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
    },
});
