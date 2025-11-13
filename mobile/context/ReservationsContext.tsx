// context/ReservationsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reservation } from "../types/reservation";

const STORAGE_KEY = "reservations";

interface ReservationsContextValue {
  reservations: Reservation[];
  addReservation: (data: Omit<Reservation, "id" | "createdAt">) => Promise<void>;
  updateReservation: (reservation: Reservation) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
}

const ReservationsContext = createContext<ReservationsContextValue | null>(null);

export function ReservationsProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // JSON에서 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Reservation[] = JSON.parse(raw);
          setReservations(parsed);
        }
      } catch (e) {
        console.warn("Failed to load reservations", e);
      }
    })();
  }, []);

  // JSON으로 저장
  const persist = async (items: Reservation[]) => {
    setReservations(items);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items, null, 2));
    } catch (e) {
      console.warn("Failed to save reservations", e);
    }
  };

  const addReservation: ReservationsContextValue["addReservation"] = async (
    data
  ) => {
    const now = new Date();
    const newItem: Reservation = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: now.toISOString(),
    };
    const next = [...reservations, newItem];
    await persist(next);
  };

  const updateReservation: ReservationsContextValue["updateReservation"] =
    async (reservation) => {
      const next = reservations.map((r) =>
        r.id === reservation.id ? reservation : r
      );
      await persist(next);
    };

  const deleteReservation: ReservationsContextValue["deleteReservation"] =
    async (id) => {
      const next = reservations.filter((r) => r.id !== id);
      await persist(next);
    };

  return (
    <ReservationsContext.Provider
      value={{ reservations, addReservation, updateReservation, deleteReservation }}
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
