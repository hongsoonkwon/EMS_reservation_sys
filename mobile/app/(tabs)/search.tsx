import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Keyboard,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReservations } from "../../context/ReservationsContext";
import { CalendarView } from "../../components/CalendarView";
import { ReservationByDateModal } from "../../components/ReservationByDateModal";
import { useReservationModal } from "../../context/ReservationModalContext";

export default function SearchScreen() {
  const { reservations } = useReservations();
  const [keyword, setKeyword] = useState("");

  // 🔥 전역 Modal 상태
  const { visible, date, open, close } = useReservationModal();

  return (
    <>
      {/* 키보드 닫기 위해 Pressable 감싸기 */}
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* 🔍 검색 바 */}
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#777"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              value={keyword}
              onChangeText={setKeyword}
              placeholder="이름 또는 전화번호로 검색"
              returnKeyType="search"
            />
          </View>

          {/* 📅 캘린더 */}
          <CalendarView
            reservations={reservations}
            keyword={keyword}
            onSelectDate={(dateString) => {
              open(dateString); // 🔥 글로벌 모달 오픈
            }}
          />
        </ScrollView>
      </Pressable>

      {/* 날짜별 예약 모달 */}
      <ReservationByDateModal
        visible={visible}
        date={date}
        reservations={reservations}
        onClose={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    padding: 16,
    backgroundColor: "#f2f2f2",
    flexGrow: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 14,
    paddingVertical: 10,  // 🔥 높이를 조금 키워서 자연스럽게
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 2,   // 🔥 너무 작지도 크지도 않게 최적값
    fontSize: 15,
  },
});
