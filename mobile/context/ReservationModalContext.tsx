import { createContext, useContext, useState } from "react";

interface ModalState {
    date: string | null;
    visible: boolean;
    open: (date: string) => void;
    close: () => void;
}

const ReservationModalContext = createContext<ModalState | null>(null);

export function ReservationModalProvider({ children }: { children: React.ReactNode }) {
    const [date, setDate] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    const open = (d: string) => {
        setDate(d);
        setVisible(true);
    };

    const close = () => {
        setVisible(false);
    };

    return (
        <ReservationModalContext.Provider value={{ date, visible, open, close }}>
            {children}
        </ReservationModalContext.Provider>
    );
}

export function useReservationModal() {
    const ctx = useContext(ReservationModalContext);
    if (!ctx) throw new Error("useReservationModal must be used inside Provider");
    return ctx;
}
