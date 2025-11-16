import { Pressable, StyleSheet, Text, View } from "react-native";
import { Reservation } from "../types/reservation";

interface Props {
    reservation: Reservation;
    onPress?: () => void;
}

export function ReservationCard({ reservation, onPress }: Props) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [
            styles.card,
            pressed && { opacity: 0.85 },
        ]}>
            <Text style={styles.name}>{reservation.name}</Text>
            <Text style={styles.phone}>{reservation.phone}</Text>
            <Text style={styles.info}>예약 날짜: {reservation.date}</Text>
            <Text style={styles.info}>출발지: {reservation.from}</Text>
            <Text style={styles.info}>도착지: {reservation.to}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 8,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    name: {
        fontWeight: "bold",
        fontSize: 16,
    },
    phone: {
        marginTop: 2,
    },
    info: {
        marginTop: 2,
        color: "#555",
    },
});
