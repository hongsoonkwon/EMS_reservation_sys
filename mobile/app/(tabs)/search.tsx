// app/(tabs)/search.tsx
import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Button,
} from "react-native";
import { useRouter } from "expo-router";
import { useReservations } from "../../context/ReservationsContext";
import { Reservation } from "../../types/reservation";

function isFutureOrToday(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr);
  // 날짜 비교 위해 시/분/초 초기화 (조금 러프해도 괜찮음)
  const todayDay = new Date(today.toISOString().slice(0, 10));
  const targetDay = new Date(dateStr);
  return targetDay >= todayDay;
}

export default function SearchScreen() {
  const { reservations, deleteReservation } = useReservations();
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!keyword.trim()) return reservations;
    const key = keyword.trim();
    return reservations.filter(
      (r) => r.name.includes(key) || r.phone.includes(key)
    );
  }, [keyword, reservations]);

  const upcoming = filtered.filter((r) => isFutureOrToday(r.date));
  const past = filtered.filter((r) => !isFutureOrToday(r.date));

  const handleDelete = async (r: Reservation) => {
    if (!isFutureOrToday(r.date)) {
      alert("지난 예약은 삭제할 수 없습니다.");
      return;
    }
    await deleteReservation(r.id);
  };

  const renderCard = (r: Reservation) => (
    <View key={r.id} style={styles.card}>
      <Pressable
        style={{ flex: 1 }}
        onPress={() =>
          router.push({
            pathname: "/reservation/[id]",
            params: { id: r.id },
          })
        }
      >
        <Text style={styles.cardTitle}>{r.name}</Text>
        <Text>{r.phone}</Text>
        <Text>예약 날짜: {r.date}</Text>
        <Text>출발지: {r.from}</Text>
      </Pressable>
      {isFutureOrToday(r.date) && (
        <View style={styles.deleteButtonWrapper}>
          <Button title="삭제" onPress={() => handleDelete(r)} />
        </View>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>예약 검색</Text>

      <TextInput
        style={styles.input}
        value={keyword}
        onChangeText={setKeyword}
        placeholder="이름 또는 전화번호로 검색"
      />

      <Text style={styles.sectionTitle}>다가올 예약</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.emptyText}>다가올 예약이 없습니다.</Text>
      ) : (
        upcoming.map(renderCard)
      )}

      <Text style={styles.sectionTitle}>지난 예약</Text>
      {past.length === 0 ? (
        <Text style={styles.emptyText}>지난 예약이 없습니다.</Text>
      ) : (
        past.map(renderCard)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 4,
    color: "#666",
  },
  card: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  deleteButtonWrapper: {
    marginLeft: 8,
  },
});
