import { createContext, useContext, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("tc_user");
    return raw ? JSON.parse(raw) : null;
  });

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
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tc_token");
    localStorage.removeItem("tc_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, enroll, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
