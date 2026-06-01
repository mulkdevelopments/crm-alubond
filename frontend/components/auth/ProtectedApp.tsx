"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthProvider } from "@/components/auth/AuthContext";
import { AIAssistantFab } from "@/components/ai/AIAssistantFab";
import { MobileNav } from "@/components/shell/MobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { clearSession, getStoredUser, getToken, setSession } from "@/lib/auth";
import { AuthUser, fetchMe, getMyLatestLocationPing } from "@/lib/auth-api";

type ProtectedAppProps = {
  children: React.ReactNode;
};

const TELEMETRY_STORAGE_KEY = "alubond-location-telemetry";

function readStoredTelemetry() {
  if (typeof window === "undefined") {
    return {
      isTracking: false,
      lastPingAt: null as string | null,
      lastPingSuccess: null as boolean | null,
      nextPingAt: null as string | null,
      lastLat: null as number | null,
      lastLng: null as number | null,
      lastLocationName: null as string | null,
    };
  }
  try {
    const raw = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) throw new Error("missing");
    const parsed = JSON.parse(raw) as {
      lastPingAt?: string | null;
      lastPingSuccess?: boolean | null;
      nextPingAt?: string | null;
      lastLat?: number | null;
      lastLng?: number | null;
      lastLocationName?: string | null;
    };
    return {
      isTracking: false,
      lastPingAt: parsed.lastPingAt ?? null,
      lastPingSuccess: parsed.lastPingSuccess ?? null,
      nextPingAt: parsed.nextPingAt ?? null,
      lastLat: parsed.lastLat ?? null,
      lastLng: parsed.lastLng ?? null,
      lastLocationName: parsed.lastLocationName ?? null,
    };
  } catch {
    return {
      isTracking: false,
      lastPingAt: null as string | null,
      lastPingSuccess: null as boolean | null,
      nextPingAt: null as string | null,
      lastLat: null as number | null,
      lastLng: null as number | null,
      lastLocationName: null as string | null,
    };
  }
}

export function ProtectedApp({ children }: ProtectedAppProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login";
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [locationTelemetry, setLocationTelemetry] = useState(readStoredTelemetry);

  useEffect(() => {
    const isAuthPage = pathname === "/login";
    if (isAuthPage) {
      setChecking(false);
      return;
    }

    const activeToken = getToken();
    if (!activeToken) {
      router.replace("/login");
      return;
    }

    setToken(activeToken);
    setUser(getStoredUser());

    fetchMe(activeToken)
      .then((profile) => {
        setSession(activeToken, profile);
        setUser(profile);
        setChecking(false);
      })
      .catch(() => {
        clearSession();
        setToken(null);
        setUser(null);
        router.replace("/login");
      });
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isAuthPage) {
      setLocationTelemetry({
        isTracking: false,
        lastPingAt: null,
        lastPingSuccess: null,
        nextPingAt: null,
        lastLat: null,
        lastLng: null,
        lastLocationName: null,
      });
      window.localStorage.removeItem(TELEMETRY_STORAGE_KEY);
      return;
    }

    // During app bootstrap token can be temporarily null; keep persisted telemetry.
    if (!token || !("geolocation" in navigator)) {
      setLocationTelemetry((prev) => ({
        ...prev,
        isTracking: false,
        nextPingAt: null,
      }));
      return;
    }
    // Ping collection is visit-driven only (logged from visit activities), not interval-based.
    setLocationTelemetry((prev) => ({
      ...prev,
      isTracking: false,
      nextPingAt: null,
    }));

    return () => {
      setLocationTelemetry((prev) => ({
        ...prev,
        isTracking: false,
        nextPingAt: null,
      }));
    };
  }, [token, isAuthPage]);

  useEffect(() => {
    if (!token || isAuthPage) return;
    let cancelled = false;
    void getMyLatestLocationPing(token)
      .then((ping) => {
        if (cancelled || !ping) return;
        setLocationTelemetry((prev) => ({
          ...prev,
          isTracking: false,
          lastPingAt: ping.recordedAt,
          lastPingSuccess: true,
          nextPingAt: null,
          lastLat: ping.lat,
          lastLng: ping.lng,
          // We only persist resolved names from current session geocoding.
          lastLocationName: prev.lastLocationName,
        }));
      })
      .catch(() => {
        // Ignore refresh sync errors; keep current cached telemetry.
      });
    return () => {
      cancelled = true;
    };
  }, [token, isAuthPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      TELEMETRY_STORAGE_KEY,
      JSON.stringify({
        lastPingAt: locationTelemetry.lastPingAt,
        lastPingSuccess: locationTelemetry.lastPingSuccess,
        nextPingAt: locationTelemetry.nextPingAt,
        lastLat: locationTelemetry.lastLat,
        lastLng: locationTelemetry.lastLng,
        lastLocationName: locationTelemetry.lastLocationName,
      })
    );
  }, [
    locationTelemetry.lastPingAt,
    locationTelemetry.lastPingSuccess,
    locationTelemetry.nextPingAt,
    locationTelemetry.lastLat,
    locationTelemetry.lastLng,
    locationTelemetry.lastLocationName,
  ]);

  function handleLogout() {
    clearSession();
    setToken(null);
    setUser(null);
    router.replace("/login");
  }

  function reportVisitPing(payload: {
    lat: number;
    lng: number;
    accuracyM?: number | null;
    recordedAt?: string;
    locationName?: string | null;
  }) {
    const recordedAt = payload.recordedAt ?? new Date().toISOString();
    setLocationTelemetry((prev) => ({
      ...prev,
      isTracking: false,
      lastPingAt: recordedAt,
      lastPingSuccess: true,
      nextPingAt: null,
      lastLat: payload.lat,
      lastLng: payload.lng,
      lastLocationName: payload.locationName ?? prev.lastLocationName,
    }));
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-3">Checking session...</div>
      </div>
    );
  }

  return (
    <AuthProvider
      value={{
        user,
        token,
        setAuthUser: setUser,
        logout: handleLogout,
        locationTelemetry,
        reportVisitPing,
      }}
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 pb-24 lg:pb-12">{children}</main>
          <AIAssistantFab />
          <MobileNav />
        </div>
      </div>
    </AuthProvider>
  );
}

