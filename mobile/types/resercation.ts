// types/reservation.ts
export interface Reservation {
  id: string;             // 각 예약 고유 ID
  name: string;           // 예약자 이름
  phone: string;          // 전화번호
  from: string;           // 출발지
  to: string;             // 도착지
  createdAt: string;      // 예약 등록 날짜 (ISO 문자열)
  date: string;           // 출발 날짜(예약 날짜, YYYY-MM-DD)
  time: string;           // HH:MM
  notes: string;          // 특이사항 (메모)
}