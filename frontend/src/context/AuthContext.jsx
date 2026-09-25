import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("tc_user");
    return raw ? JSON.parse(raw) : null;
  });
  // Status ng registration ng parent's client - 'pending' | 'active' |
  // 'rejected', o null habang di pa alam / hindi naman parent. Ginagamit ng
  // ProtectedRoute para i-gate ang buong /parent/* area hanggang aprubado.
  const [clientStatus, setClientStatus] = useState(null);
  // Simulan bilang "loading" na kung parent na agad sa unang render (e.g.
  // refresh habang naka-login) - iwas sa isang split-second na flash bago
  // pa man tumakbo ang useEffect sa baba.
  const [clientStatusLoading, setClientStatusLoading] = useState(() => user?.role === "parent");

  const refreshClientStatus = useCallback(async () => {
    setClientStatusLoading(true);
    try {
      const { data } = await api.get("/enrollment/me");
      setClientStatus({
        status: data.enrollment.status,
        rejection_reason: data.enrollment.rejection_reason,
        client_name: data.enrollment.name,
      });
    } catch {
      setClientStatus(null);
    } finally {
      setClientStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "parent") {
      refreshClientStatus();
    } else {
      setClientStatus(null);
    }
  }, [user, refreshClientStatus]);

  // role = yung pinili sa login page (parent / therapist / admin), chine-check ng backend
  const login = useCallback(async (email, password, role) => {
    const { data } = await api.post("/auth/login", { email, password, role });
    localStorage.setItem("tc_token", data.token);
    localStorage.setItem("tc_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const enroll = useCallback(async (details) => {
    const { data } = await api.post("/enrollment", details);
    localStorage.setItem("tc_token", data.token);
    localStorage.setItem("tc_user", JSON.stringify(data.user));
    setUser(data.user);
    setClientStatus({
      status: data.enrollment.status,
      rejection_reason: data.enrollment.rejection_reason,
      client_name: data.enrollment.name,
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tc_token");
    localStorage.removeItem("tc_user");
    setUser(null);
    setClientStatus(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, enroll, logout, clientStatus, clientStatusLoading, refreshClientStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
