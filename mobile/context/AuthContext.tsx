// context/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";

const API_BASE_URL = "http://172.18.41.167:4000";

// -----------------------------
// Type 정의
// -----------------------------
export type UserRole = "master" | "admin" | "user";

export interface Admin {
    id: number;
    username: string;
    role: UserRole;
}

interface LoginParams {
    username: string;
    password: string;
}

interface AuthContextType {
    admin: Admin | null;
    isLoading: boolean;
    login: (params: LoginParams) => Promise<void>;
    logout: () => void;
    getAuthHeader: () => Record<string, string>;
}

// -----------------------------
const AuthContext = createContext<AuthContextType>({
    admin: null,
    isLoading: false,
    login: async () => { },
    logout: () => { },
    getAuthHeader: () => ({}),
});

// -----------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // -----------------------------
    // 로그인
    // -----------------------------
    const login = async ({ username, password }: LoginParams) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
            }

            const json = await res.json();
            setAdmin(json.admin);
        } finally {
            setIsLoading(false);
        }
    };

    // -----------------------------
    // 로그아웃
    // -----------------------------
    const logout = () => {
        setAdmin(null);
    };

    // -----------------------------
    // 서버 요청 헤더
    // -----------------------------
    const getAuthHeader = () => {
        if (!admin) return {};
        return {
            "x-admin": JSON.stringify(admin),
        };
    };

    return (
        <AuthContext.Provider
            value={{
                admin,
                isLoading,
                login,
                logout,
                getAuthHeader,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Hook
export const useAuth = () => useContext(AuthContext);
