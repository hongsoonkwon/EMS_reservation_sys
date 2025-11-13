// app/_layout.tsx
import { Stack } from "expo-router";
import { ReservationsProvider } from "../context/ReservationsContext";

export default function RootLayout() {
  return (
    <ReservationsProvider>
      <Stack>
        {/* 탭들 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* 2nd layer: 예약 상세/편집 화면 */}
        <Stack.Screen
          name="reservation/[id]"
          options={{ title: "예약 상세" }}
        />
      </Stack>
    </ReservationsProvider>
  );
}
