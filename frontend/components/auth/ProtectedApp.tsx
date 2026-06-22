"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BookOpen, KanbanSquare, LayoutDashboard, LogOut, MapPin, UserCircle2, UserCog, UserPlus, Users, X } from "lucide-react";

import { AuthProvider } from "@/components/auth/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AIAssistantFab } from "@/components/ai/AIAssistantFab";
import { QuickActivityFab } from "@/components/activity/QuickActivityFab";
import { MobileNav } from "@/components/shell/MobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { clearSession, getStoredUser, getToken, setSession } from "@/lib/auth";
import { AuthUser, fetchMe, getMyLatestLocationPing } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

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

const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password", "/request-access"];

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.includes(pathname);
}

export function ProtectedApp({ children }: ProtectedAppProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = isPublicAuthPath(pathname);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationTelemetry, setLocationTelemetry] = useState(readStoredTelemetry);
  const mobileMenuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/map", label: "Geo Intel", icon: MapPin },
    { href: "/follow-ups", label: "Follow-ups", icon: Bell },
    { href: "/team", label: "Field Team", icon: Users },
    { href: "/docs", label: "Docs", icon: BookOpen },
    ...(user?.role === "ADMIN"
      ? [
          { href: "/access-requests", label: "Access requests", icon: UserPlus },
          { href: "/users", label: "Users", icon: UserCog },
        ]
      : []),
    { href: "/profile", label: "Profile", icon: UserCircle2 },
  ];

  useEffect(() => {
    if (isPublicAuthPath(pathname)) {
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
    setMobileMenuOpen(false);
  }, [pathname]);

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

  if (isPublicAuthPath(pathname)) {
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
          <Topbar onMenu={() => setMobileMenuOpen((prev) => !prev)} />
          <main className="flex-1 pb-24 lg:pb-12">{children}</main>
          <QuickActivityFab />
          <AIAssistantFab />
          <MobileNav />
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/45" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="h-full w-[280px] max-w-[85vw] surface border-r border-[var(--border)] shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-16 px-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <BrandLogo markSize="sm" className="min-w-0" />
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="p-3 space-y-1.5">
              {mobileMenuItems.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-2 hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[var(--border)] mt-auto">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl text-sm text-rose-600 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}

