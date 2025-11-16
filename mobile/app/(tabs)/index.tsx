// app/(tabs)/index.tsx

import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useReservations } from "../../context/ReservationsContext";
import { ReservationFormModal } from "../../components/ReservationFormModal";
import { ReservationByDateModal } from "../../components/ReservationByDateModal";
import { useAuth } from "../../context/AuthContext";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const { reservations } = useReservations();

  const { admin } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = formatDate(today);

  /** 🔥 오늘 예약 목록 + 시간 ASC 정렬 */
  const todaysReservations = reservations
    .filter((r) => r.date === todayStr)
    .sort((a, b) => (a.time > b.time ? 1 : -1));

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>

          {/* 예약하기 카드 */}
          {(admin?.role === "master" || admin?.role === "admin") && (
            <Pressable
              onPress={() => setIsFormOpen(true)}
              style={({ pressed }) => [
                styles.bookingCard,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.bookingTitle}>예약하기</Text>
              <Text style={styles.bookingSubtitle}>
                구급차 예약을 새로 등록하려면 눌러주세요.
              </Text>
            </Pressable>
          )}

          {/* 오늘 예약 박스 */}
          <Pressable
            onPress={() => {
              setSelectedDate(todayStr);
              setModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.todayBox,
              pressed && { opacity: 0.95 },
            ]}
          >
            <Text style={styles.todayTitle}>오늘({todayStr}) 예약 목록</Text>

            {todaysReservations.length === 0 ? (
              <Text style={styles.emptyText}>오늘 예약된 항목이 없습니다.</Text>
            ) : (
              todaysReservations.slice(0, 3).map((r) => (
                <View key={r.id} style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: "600" }}>
                    {r.time} — {r.name}
                  </Text>
                  <Text style={{ color: "#555" }}>
                    {r.from} → {r.to}
                  </Text>
                </View>
              ))
            )}

            {todaysReservations.length > 0 && (
              <Text style={styles.moreText}>전체 목록 보기 →</Text>
            )}
          </Pressable>

        </View>
      </SafeAreaView>

      {/* 예약하기 모달 */}
      <ReservationFormModal
        visible={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      {/* 날짜 기반 예약 모달 */}
      <ReservationByDateModal
        visible={modalVisible}
        date={selectedDate}
        reservations={reservations}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    paddingTop: 70,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#f2f2f2",
    flex: 1,
  },
  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  bookingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bookingSubtitle: {
    fontSize: 14,
    color: "#555",
  },
  todayBox: {
    marginTop: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: {
    marginTop: 4,
    color: "#666",
  },
  moreText: {
    marginTop: 10,
    textAlign: "right",
    color: "#007AFF",
    fontWeight: "600",
  },
});
