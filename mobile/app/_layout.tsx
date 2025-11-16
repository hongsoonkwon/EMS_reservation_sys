// app/_layout.tsx 또는 RootLayout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { ReservationsProvider } from "../context/ReservationsContext";
import { ReservationModalProvider } from "../context/ReservationModalContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect } from "react";

function RootNavigator() {
  const { admin, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    // 🔥 로그인 안 되어 있는데 tabs쪽이면 → 로그인 화면으로 이동
    if (!admin && inTabsGroup) {
      router.replace("(auth)/login");
    }

    // 🔥 로그인되어 있는데 인증 페이지에 있으면 → tabs로 이동
    if (admin && inAuthGroup) {
      router.replace("(tabs)");
    }
  }, [admin, isLoading, segments]);

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
