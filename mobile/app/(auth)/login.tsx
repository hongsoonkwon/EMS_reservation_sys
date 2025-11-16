// app/(auth)/login.tsx
import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

export default function LoginScreen() {
    const router = useRouter();
    const { login, admin, loading } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // 🔥 로그인 이미 되어 있으면 바로 이동
    useEffect(() => {
        if (admin) {
            router.replace("(tabs)");
        }
    }, [admin]);

    const handleSubmit = async () => {
        try {
            setError(null);
            setSubmitting(true);

            await login({ username, password });

            // 🔥 로그인 성공 → AuthContext에서 admin이 채워짐 → 위 useEffect가 자동실행
        } catch (e: any) {
            setError(e.message ?? "로그인에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>EMS 예약 시스템</Text>

            <TextInput
                style={styles.input}
                placeholder="아이디"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                style={styles.input}
                placeholder="비밀번호"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                    styles.loginButton,
                    pressed && { opacity: 0.8 },
                ]}
            >
                <Text style={styles.loginText}>
                    {submitting ? "로그인 중..." : "로그인"}
                </Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: "center" },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        fontSize: 16,
    },
    loginButton: {
        marginTop: 8,
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    loginText: { color: "white", fontWeight: "600", fontSize: 16 },
    error: { color: "#ff4d4d", marginBottom: 8 },
});
