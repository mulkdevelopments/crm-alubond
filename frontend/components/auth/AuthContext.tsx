"use client";

import { createContext, useContext } from "react";

import { AuthUser } from "@/lib/auth-api";

export type LocationTelemetry = {
  isTracking: boolean;
  lastPingAt: string | null;
  lastPingSuccess: boolean | null;
  nextPingAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationName: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  setAuthUser: (user: AuthUser | null) => void;
  logout: () => void;
  locationTelemetry: LocationTelemetry;
  reportVisitPing: (payload: {
    lat: number;
    lng: number;
    accuracyM?: number | null;
    recordedAt?: string;
    locationName?: string | null;
  }) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  value: AuthContextValue;
  children: React.ReactNode;
};

export function AuthProvider({ value, children }: AuthProviderProps) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
