import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type UserRole = "admin" | "customer" | "traveler" | "reseller";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "bagasishare_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  async function login(email: string, _password: string, role: UserRole) {
    // Demo login: instead of real backend, generate user from email + selected role
    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Pengguna";
    const newUser: User = { id: crypto.randomUUID(), name, email, role };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  async function register(name: string, email: string, _password: string, role: UserRole) {
    const newUser: User = { id: crypto.randomUUID(), name, email, role };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin BagasiShare",
  customer: "Customer / Pengirim Barang",
  traveler: "Traveler / Penyedia Bagasi",
  reseller: "Merchant / Penjual",
};

export const roleColors: Record<UserRole, string> = {
  admin: "#7c3aed",
  customer: "#2f70ff",
  traveler: "#0ea5e9",
  reseller: "#f59e0b",
};
