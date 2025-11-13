// app/reservation/[id].tsx
import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Button,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useReservations } from "../../context/ReservationsContext";
import { Reservation } from "../../types/reservation";

function isFutureOrToday(dateStr: string) {
  const today = new Date();
  const todayDay = new Date(today.toISOString().slice(0, 10));
  const targetDay = new Date(dateStr);
  return targetDay >= todayDay;
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reservations, updateReservation } = useReservations();

  const reservation = reservations.find((r) => r.id === id);

  const [notes, setNotes] = useState(reservation?.notes ?? "");

  // 같은 이름 + 전화번호의 모든 예약에서 특이사항 모으기
  const noteHistory = useMemo(() => {
    if (!reservation) return [];
    return reservations
      .filter(
        (r) => r.name === reservation.name && r.phone === reservation.phone
      )
      .filter((r) => r.notes && r.notes.trim().length > 0)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [reservation, reservations]);

  if (!reservation) {
    return (
      <View style={styles.container}>
        <Text>해당 예약을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const updated: Reservation = {
      ...reservation,
      notes,
    };
    await updateReservation(updated);
    alert("특이사항이 저장되었습니다.");
  };

  const canDelete = isFutureOrToday(reservation.date);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>예약 상세 정보</Text>

      <View style={styles.section}>
        <Text style={styles.label}>이름</Text>
        <Text style={styles.value}>{reservation.name}</Text>

        <Text style={styles.label}>전화번호</Text>
        <Text style={styles.value}>{reservation.phone}</Text>

        <Text style={styles.label}>예약 날짜</Text>
        <Text style={styles.value}>{reservation.date}</Text>

        <Text style={styles.label}>출발지</Text>
        <Text style={styles.value}>{reservation.from}</Text>

        <Text style={styles.label}>도착지</Text>
        <Text style={styles.value}>{reservation.to}</Text>

        <Text style={styles.label}>등록일</Text>
        <Text style={styles.value}>
          {reservation.createdAt.slice(0, 10)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>특이사항 (이 예약)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="이 예약에 대한 메모를 입력하세요."
          multiline
        />
        <Button title="특이사항 저장" onPress={handleSave} />
        {!canDelete && (
          <Text style={styles.infoText}>
            지난 예약이라 삭제는 Search 탭에서도 불가능합니다.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>
          이 사람의 예약 특이사항 히스토리
        </Text>
        {noteHistory.length === 0 ? (
          <Text style={styles.infoText}>등록된 특이사항이 없습니다.</Text>
        ) : (
          noteHistory.map((r) => (
            <View key={r.id} style={styles.historyItem}>
              <Text style={styles.historyDate}>{r.date}</Text>
              <Text style={styles.historyNotes}>{r.notes}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  label: {
    marginTop: 8,
    fontWeight: "600",
  },
  value: {
    marginTop: 2,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    minHeight: 80,
    marginBottom: 8,
  },
  infoText: {
    marginTop: 4,
    color: "#666",
  },
  historyItem: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  historyDate: {
    fontWeight: "600",
    marginBottom: 4,
  },
  historyNotes: {},
});
