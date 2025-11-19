//app/(tabs)/settings.tsx
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useReservations } from "../../context/ReservationsContext";
import { API_BASE_URL } from "../../constants/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { admin, logout, getAuthHeader } = useAuth();
  const { reloadReservations } = useReservations();

  const [accountList, setAccountList] = useState<any[]>([]);
  const [listVisible, setListVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const insets = useSafeAreaInsets();

  if (!admin) return null;

  const isMaster = admin.role === "master";
  const isAdmin = admin.role === "admin";

  // ---------------------------
  // 계정 목록 조회
  // ---------------------------
  const fetchAccounts = async () => {
    const targetRole = isMaster ? "admin" : "user";

    try {
      const res = await fetch(
        `${API_BASE_URL}/admins?role=${targetRole}`,
        {
          headers: {
            ...getAuthHeader(),
          },
        }
      );

      if (!res.ok) {
        Alert.alert("오류", "계정 목록을 불러올 수 없습니다.");
        return;
      }

      const json = await res.json();
      setAccountList(json.admins ?? []);
    } catch (e) {
      console.warn("Failed to load account list", e);
    }
  };

  // ---------------------------
  // 계정 생성
  // ---------------------------
  const createAccount = async () => {
  if (!newUsername.trim() || !newPassword.trim()) {
    Alert.alert("입력 오류", "모든 필드를 입력하세요.");
    return;
  }

  const endpoint = isMaster
    ? "/admins/create-admin"
    : "/admins/create-user";

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword.trim(),
      }),
    });

    if (!res.ok) {
      // 🔥 여기만 수정
      const text = await res.text();
      Alert.alert(
        "오류",
        `계정 생성 실패\nstatus=${res.status}\n${text}`
      );
      return;
    }

    setCreateVisible(false);
    setNewUsername("");
    setNewPassword("");
    fetchAccounts();
  } catch (e) {
    console.warn("Failed to create account", e);
    Alert.alert("오류", "네트워크 오류 (계정 생성)");
  }
};



  // ---------------------------
  // 계정 삭제 (MASTER 전용)
  // ---------------------------
  const deleteAccount = async (id: number) => {
    Alert.alert("삭제하시겠습니까?", "", [
      { text: "아니오", style: "cancel" },
      {
        text: "예",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/admins/${id}`, {
              method: "DELETE",
              headers: { ...getAuthHeader() },
            });

            if (!res.ok) {
              Alert.alert("오류", "삭제 실패");
              return;
            }

            fetchAccounts();
            await reloadReservations();   // ✔ 여기!
          } catch (e) {
            console.warn("Delete failed", e);
          }
        },
      },
    ]);
  };


  // ---------------------------
  // UI
  // ---------------------------
  const roleLabel =
    admin.role === "master"
      ? "마스터 관리자"
      : admin.role === "admin"
        ? "관리자"
        : "일반 사용자";

  return (
    <SafeAreaView style={{
                flex: 1,
                paddingTop: insets.top + 20,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left + 20,
                paddingRight: insets.right + 20,
                backgroundColor: "#fff",}}>
                  
      <View style={styles.container}>
      <Text style={styles.title}>설정</Text>

      <Text style={styles.info}>
        로그인 계정: {admin.username} ({roleLabel})
      </Text>

      {/* MASTER 또는 ADMIN만 계정 관리 기능 표시 */}
      {(isMaster || isAdmin) && (
        <>
          <Pressable
            onPress={() => {
              fetchAccounts();
              setListVisible(true);
            }}
            style={styles.menuButton}
          >
            <Text style={styles.menuText}>
              {isMaster ? "Admin 계정 목록" : "User 계정 목록"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCreateVisible(true)}
            style={styles.menuButton}
          >
            <Text style={styles.menuText}>
              {isMaster ? "Admin 계정 생성" : "User 계정 생성"}
            </Text>
          </Pressable>
        </>
      )}

      {/* 로그아웃 */}
      <Pressable
        onPress={logout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>

      {/* --------------------------- */}
      {/* 계정 목록 Modal */}
      {/* --------------------------- */}
      <Modal visible={listVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>계정 목록</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              {accountList.map((acc) => (
                <View key={acc.id} style={styles.accountItem}>
                  <View>
                    <Text style={{ fontWeight: "600" }}>{acc.username}</Text>
                    <Text style={{ color: "#555" }}>{acc.role}</Text>
                  </View>

                  {/* USER 삭제는 admin 가능 / ADMIN 삭제는 master만 가능 */}
                  {(isMaster || (isAdmin && acc.role === "user")) && (
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => deleteAccount(acc.id)}
                    >
                      <Text style={{ color: "white", fontWeight: "600" }}>
                        삭제
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setListVisible(false)}
              style={styles.closeBtn}
            >
              <Text>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --------------------------- */}
      {/* 계정 생성 Modal */}
      {/* --------------------------- */}
      <Modal visible={createVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>새 계정 생성</Text>

            <TextInput
              style={styles.input}
              placeholder="username"
              value={newUsername}
              onChangeText={setNewUsername}
            />

            <TextInput
              style={styles.input}
              placeholder="password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Pressable onPress={createAccount} style={styles.saveBtn}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>생성</Text>
            </Pressable>

            <Pressable
              onPress={() => setCreateVisible(false)}
              style={styles.closeBtn}
            >
              <Text>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  info: { marginBottom: 24 },

  menuButton: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  menuText: { fontWeight: "600", fontSize: 16 },

  logoutButton: {
    marginTop: 40,
    backgroundColor: "#ff4d4d",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: { color: "white", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },

  accountItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  deleteBtn: {
    backgroundColor: "#ff4d4d",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },

  closeBtn: {
    marginTop: 16,
    alignSelf: "center",
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
});
