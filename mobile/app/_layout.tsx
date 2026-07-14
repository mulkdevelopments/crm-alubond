import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { BrandMark } from "@/components/BrandLogo";
import { AppFloatingActions } from "@/components/shell/AppFloatingActions";
import { AppShellProvider } from "@/components/shell/AppShellContext";
import { fetchMe, login as loginApi, type AuthUser } from "@/lib/api/auth-api";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { clearSession, getStoredToken, getStoredUser, saveSession } from "@/lib/auth/session";
import { ThemePreferenceProvider } from "@/lib/theme/ThemePreferenceContext";
import { colors } from "@/constants/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf") });
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    async function boot() {
      try {
        const storedToken = await getStoredToken();
        const storedUser = await getStoredUser();
        if (cancelled) return;
        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(storedUser);
          try {
            const fresh = await fetchMe(storedToken);
            if (cancelled) return;
            setUser(fresh);
            await saveSession(storedToken, fresh);
          } catch {
            await clearSession();
            if (cancelled) return;
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // SecureStore / network failures must not leave the splash stuck or kill boot.
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
          await SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginApi(email, password);
    await saveSession(result.token, result.user);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const fresh = await fetchMe(token);
    setUser(fresh);
    await saveSession(token, fresh);
  }, [token]);

  const authValue = useMemo(
    () => ({
      user,
      token,
      loading: booting,
      login,
      logout,
      refreshUser,
      setUser,
    }),
    [user, token, booting, login, logout, refreshUser]
  );

  if (!loaded || booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <BrandMark size="lg" />
        <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <AuthProvider value={authValue}>
      <ThemePreferenceProvider>
        <AppShellProvider>
          <RootNavigator />
        </AppShellProvider>
      </ThemePreferenceProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuth = segments[0] === "(auth)";
    const authScreen = segments[1];

    if (!token && !inAuth) {
      router.replace("/(auth)/login");
    } else if (token && inAuth && authScreen === "login") {
      router.replace("/(tabs)");
    }
  }, [token, segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="project/[id]" options={{ headerShown: true, title: "Project" }} />
        <Stack.Screen name="project/form" options={{ headerShown: true, title: "Project" }} />
        <Stack.Screen name="users/form" options={{ headerShown: true, title: "User" }} />
      </Stack>
      {token ? <AppFloatingActions /> : null}
    </>
  );
}
