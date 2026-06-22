import { createContext, useContext, type ReactNode } from "react";

import type { AuthUser } from "@/lib/api/auth-api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}

export function canAccessTeam(role: AuthUser["role"] | undefined) {
  return role === "MANAGER" || role === "REGIONAL_MANAGER" || role === "CEO" || role === "ADMIN";
}

export function canManageProjects(role: AuthUser["role"] | undefined) {
  return role === "ADMIN" || role === "CEO" || role === "MANAGER" || role === "REGIONAL_MANAGER";
}

export function canSetBusinessDivision(user: AuthUser | null | undefined) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.role === "REGIONAL_MANAGER" && Boolean(user.canSetBusinessDivision);
}
