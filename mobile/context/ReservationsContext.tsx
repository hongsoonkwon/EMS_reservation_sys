// context/ReservationsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Reservation } from "../types/reservation";
import { useAuth } from "./AuthContext";

const API_BASE_URL = "http://172.18.41.167:4000";

interface ReservationsContextValue {
  reservations: Reservation[];
  addReservation: (data: {
    name: string;
    phone: string;
    from: string;
    to: string;
    date: string;
    time: string;
    notes?: string;
  }) => Promise<void>;

  updateReservation: (reservation: Reservation) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  reloadReservations: () => Promise<void>;
}

const ReservationsContext = createContext<ReservationsContextValue | null>(null);

export function ReservationsProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { getAuthHeader, admin } = useAuth();

  // ------------------------------------------------
  // 예약 목록 다시 불러오기 (중앙 함수)
  // ------------------------------------------------
  const reloadReservations = async () => {
    if (!admin) return;

    try {
      const res = await fetch(`${API_BASE_URL}/reservations`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      setReservations(json.reservations ?? []);
    } catch (e) {
      console.warn("Failed to reload reservations", e);
    }
  };

  // ------------------------------------------------
  // 로그인 시 자동 로드
  // ------------------------------------------------
  useEffect(() => {
    reloadReservations();
  }, [admin]);

  // ------------------------------------------------
  // 예약 추가
  // ------------------------------------------------
  const addReservation = async (data: {
    name: string;
    phone: string;
    from: string;
    to: string;
    date: string;
    time: string;
    notes?: string;
  }) => {
    if (!admin || admin.role === "user") {
      alert("예약 생성 권한이 없습니다.");
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });

      await reloadReservations(); // 🔥 중요
    } catch (e) {
      console.warn("Failed to add reservation", e);
    }
  };

  // ------------------------------------------------
  // 예약 수정
  // ------------------------------------------------
  const updateReservation = async (reservation: Reservation) => {
    if (!admin || admin.role === "user") {
      alert("예약 수정 권한이 없습니다.");
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/reservations/${reservation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(reservation),
      });

      await reloadReservations(); // 🔥 중요
    } catch (e) {
      console.warn("Failed to update reservation", e);
    }
  };

  // ------------------------------------------------
  // 예약 삭제
  // ------------------------------------------------
  const deleteReservation = async (id: string) => {
    if (!admin || admin.role === "user") {
      alert("예약 삭제 권한이 없습니다.");
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });

      await reloadReservations(); // 🔥 중요
    } catch (e) {
      console.warn("Failed to delete reservation", e);
    }
  };

  return (
    <ReservationsContext.Provider
      value={{
        reservations,
        addReservation,
        updateReservation,
        deleteReservation,
        reloadReservations,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error("useReservations must be used inside ReservationsProvider");
  return ctx;
}
