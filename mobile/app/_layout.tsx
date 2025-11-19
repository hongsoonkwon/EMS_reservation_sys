// app/_layout.tsx 또는 RootLayout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { ReservationsProvider } from "../context/ReservationsContext";
import { ReservationModalProvider } from "../context/ReservationModalContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

function RootNavigator() {
  const { admin, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // 🔥 Stack이 화면에 마운트되었는지 체크
  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    // Stack이 먼저 렌더된 다음에 isMounted = true
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;   // 🔥 여기서 가장 중요한 조건

    const inAuth = segments[0] === "(auth)";
    const inTabs = segments[0] === "(tabs)";

    if (!admin && inTabs) {
      router.replace("(auth)/login");
    } 

    if (admin && inAuth) {
      router.replace("(tabs)");
    }
  }, [admin, isLoading, isMounted, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reservation/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReservationsProvider>
        <ReservationModalProvider>
          <RootNavigator />
        </ReservationModalProvider>
      </ReservationsProvider>
    </AuthProvider>
  );
}
