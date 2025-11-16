// app/reservation/[id].tsx
import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useReservations } from "../../context/ReservationsContext";
import { Reservation } from "../../types/reservation";
import { useAuth } from "../../context/AuthContext";

/* 전화번호 하이픈 */
function formatPhone(input: string) {
  return input
    .replace(/[^0-9]/g, "")
    .replace(/(^02|^0505|^1\d{2}|^0\d{2})(\d+)?(\d{4})$/, "$1-$2-$3")
    .replace(/--+/g, "-");
}

function isFutureOrToday(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr >= today;
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { reservations, updateReservation, deleteReservation } = useReservations();
  const { admin } = useAuth();
  const reservation = reservations.find((r) => r.id === id);

  const [isEditing, setIsEditing] = useState(false);

  const [editPhone, setEditPhone] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");     // 🔥 추가됨
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const noteHistory = useMemo(() => {
    if (!reservation) return [];
    return reservations
      .filter(
        (r) =>
          r.name === reservation.name &&
          r.phone === reservation.phone &&
          r.notes?.trim()
      )
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [reservation, reservations]);

  if (!reservation) {
    return (
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text>해당 예약을 찾을 수 없습니다.</Text>
          <Pressable
            style={[styles.closeButton, { marginTop: 12 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const canDelete = isFutureOrToday(reservation.date);

  /* 필드 초기화 */
  const resetEditFields = () => {
    setEditPhone(formatPhone(reservation.phone));
    setEditDate(reservation.date);
    setEditTime(reservation.time);      // 🔥 시간 초기화
    setEditFrom(reservation.from);
    setEditTo(reservation.to);
    setEditNotes(reservation.notes ?? "");
  };

  const startEdit = () => {
    resetEditFields();
    setIsEditing(true);
  };

  function formatTime(input: string) {
    // 숫자만
    const digits = input.replace(/\D/g, "").slice(0, 4);

    if (digits.length < 4) return input; // 아직 미완성

    const hh = digits.slice(0, 2);
    const mm = digits.slice(2);

    return `${hh}:${mm}`;
  }

  /* 저장 */
  const saveEdit = async () => {
    if (
      !editPhone.trim() ||
      !editDate.trim() ||
      !editTime.trim() ||
      !editFrom.trim() ||
      !editTo.trim()
    ) {
      Alert.alert("입력 오류", "모든 값을 입력하세요.");
      return;
    }

    const updated: Reservation = {
      ...reservation,
      phone: editPhone.trim(),
      date: editDate.trim(),
      time: editTime.trim(),          // 🔥 시간 업데이트
      from: editFrom.trim(),
      to: editTo.trim(),
      notes: editNotes.trim(),
    };

    await updateReservation(updated);
    setIsEditing(false);
  };

  /* 삭제 */
  const onDeletePress = () => {
    Alert.alert("삭제하시겠습니까?", "", [
      { text: "아니오", style: "cancel" },
      {
        text: "예",
        style: "destructive",
        onPress: async () => {
          await deleteReservation(reservation.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* 상단 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>예약 상세</Text>

          {!isEditing && (admin?.role === "master" || admin?.role === "admin") && (
            <View style={styles.headerButtons}>
              <Pressable
                onPress={startEdit}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.editButtonText}>수정</Text>
              </Pressable>

              <Pressable
                onPress={onDeletePress}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 내용 */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {/* 이름 */}
            <View style={styles.row}>
              <Text style={styles.label}>이름</Text>
              <View style={styles.valueBoxReadonly}>
                <Text style={styles.valueText}>{reservation.name}</Text>
              </View>
            </View>

            {/* 전화번호 */}
            <View style={styles.row}>
              <Text style={styles.label}>전화번호</Text>
              <View style={[styles.valueBox, isEditing && styles.editFieldBox]}>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editPhone}
                    onChangeText={(t) => setEditPhone(formatPhone(t))}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.valueText}>{reservation.phone}</Text>
                )}
              </View>
            </View>

            {/* 날짜 */}
            <View style={styles.row}>
              <Text style={styles.label}>날짜</Text>
              <View style={[styles.valueBox, isEditing && styles.editFieldBox]}>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
                  <Text style={styles.valueText}>{reservation.date}</Text>
                )}
              </View>
            </View>

            {/* 🔥 출발 시간 */}
            <View style={styles.row}>
              <Text style={styles.label}>출발 시간</Text>
              <View style={[styles.valueBox, isEditing && styles.editFieldBox]}>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editTime}
                    onChangeText={(t) => setEditTime(formatTime(t))}
                    keyboardType="number-pad"
                    placeholder="HH:mm"
                  />
                ) : (
                  <Text style={styles.valueText}>{reservation.time}</Text>
                )}
              </View>
            </View>

            {/* 출발지 */}
            <View style={styles.row}>
              <Text style={styles.label}>출발지</Text>
              <View style={[styles.valueBox, isEditing && styles.editFieldBox]}>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editFrom}
                    onChangeText={setEditFrom}
                  />
                ) : (
                  <Text style={styles.valueText}>{reservation.from}</Text>
                )}
              </View>
            </View>

            {/* 도착지 */}
            <View style={styles.row}>
              <Text style={styles.label}>도착지</Text>
              <View style={[styles.valueBox, isEditing && styles.editFieldBox]}>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editTo}
                    onChangeText={setEditTo}
                  />
                ) : (
                  <Text style={styles.valueText}>{reservation.to}</Text>
                )}
              </View>
            </View>
          </View>

          {/* 특이사항 */}
          <View style={styles.section}>
            <Text style={styles.subtitle}>특이사항 (이 예약)</Text>

            {isEditing ? (
              <TextInput
                style={styles.notesInput}
                value={editNotes}
                multiline
                onChangeText={setEditNotes}
                placeholder="메모"
              />
            ) : reservation.notes ? (
              <View style={styles.valueBoxLarge}>
                <Text style={styles.valueText}>{reservation.notes}</Text>
              </View>
            ) : (
              <Text style={styles.infoText}>특이사항이 없습니다.</Text>
            )}
          </View>

          {/* 히스토리 */}
          {!isEditing && (
            <>
              <View style={styles.separatorContainer}>
                <View style={styles.separator} />
              </View>

              <View style={styles.section}>
                <Text style={styles.subtitle}>특이사항 히스토리</Text>

                {noteHistory.length === 0 ? (
                  <Text style={styles.infoText}>등록된 기록이 없습니다.</Text>
                ) : (
                  noteHistory.map((r) => (
                    <View key={r.id} style={styles.historyItem}>
                      <Text style={styles.historyDate}>{r.date}</Text>
                      <Text style={styles.historyNotes}>{r.notes}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        {!isEditing ? (
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        ) : (
          <View style={styles.editButtonsRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: "#ccc" }]}
              onPress={() => {
                resetEditFields();
                setIsEditing(false);
              }}
            >
              <Text style={styles.actionButtonText}>취소</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { backgroundColor: "#007AFF" }]}
              onPress={saveEdit}
            >
              <Text style={[styles.actionButtonText, { color: "white" }]}>
                저장
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    width: "90%",
    height: "80%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },

  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  editButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: -6,
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontWeight: "700",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  section: { marginTop: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  label: {
    width: 90,
    fontWeight: "600",
    fontSize: 14,
  },

  valueBoxReadonly: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  valueBox: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editFieldBox: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
  },

  valueText: { fontSize: 14, color: "#333" },
  valueInput: { fontSize: 14, paddingVertical: 0 },

  valueBoxLarge: {
    marginTop: 4,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  notesInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    minHeight: 80,
    marginTop: 4,
  },

  infoText: {
    marginTop: 6,
    color: "#666",
    fontSize: 13,
  },

  separatorContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  separator: {
    height: 2,
    backgroundColor: "#444",
    borderRadius: 1,
  },

  historyItem: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  historyDate: { fontWeight: "600", fontSize: 13 },
  historyNotes: { marginTop: 4, fontSize: 14 },

  closeButton: {
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  closeButtonText: { fontWeight: "600" },

  editButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  actionButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
