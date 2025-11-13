// app/(tabs)/index.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useReservations } from "../../context/ReservationsContext";
import { Reservation } from "../../types/reservation";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}


export default function HomeScreen() {
  const { reservations, addReservation } = useReservations();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(formatDate(new Date())); // 출발 날짜

  const todayStr = formatDate(new Date());

  const todaysReservations = reservations.filter(
    (r) => r.date === todayStr
  );

  const handleSubmit = async () => {
    if (!name || !phone || !from || !to || !date) {
      alert("모든 필드를 입력해 주세요.");
      return;
    }
    await addReservation({
      name,
      phone,
      from,
      to,
      date,
      notes: "",
    });
    // 입력값 초기화
    resetForm();
    // 이름/전화번호는 한 명의 user라면 유지해도 되고, 여기선 유지
    alert("예약이 등록되었습니다.");
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setFrom("");
    setTo("");
    setDate(formatDate(new Date())); // 오늘 날짜로 초기화
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>구급차 예약 등록</Text>

      <Text style={styles.label}>예약자 이름</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="이름"
      />

      <Text style={styles.label}>전화번호</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="010-0000-0000"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>출발지</Text>
      <TextInput
        style={styles.input}
        value={from}
        onChangeText={setFrom}
        placeholder="출발지"
      />

      <Text style={styles.label}>도착지</Text>
      <TextInput
        style={styles.input}
        value={to}
        onChangeText={setTo}
        placeholder="도착지"
      />

      <Text style={styles.label}>출발 날짜 (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="예: 2025-01-01"
      />

      <View style={styles.buttonWrapper}>
        <Button title="예약 등록" onPress={handleSubmit} />
      </View>

      <Text style={[styles.title, { marginTop: 24 }]}>
        오늘({todayStr}) 예약 목록
      </Text>

      {todaysReservations.length === 0 ? (
        <Text>오늘 예약된 항목이 없습니다.</Text>
      ) : (
        todaysReservations.map((r: Reservation) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardTitle}>{r.name}</Text>
            <Text>{r.phone}</Text>
            <Text>예약 날짜: {r.date}</Text>
            <Text>출발지: {r.from}</Text>
            <Text>도착지: {r.to}</Text>
          </View>
        ))
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
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonWrapper: {
    marginTop: 16,
  },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
});
