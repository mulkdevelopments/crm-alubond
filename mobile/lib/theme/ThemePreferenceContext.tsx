import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemePreference = "light" | "dark";

const THEME_STORAGE_KEY = "alubond-theme";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(
    systemScheme === "dark" ? "dark" : "light"
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setPreference(saved);
        }
      } finally {
        setLoaded(true);
      }
    }
    void loadTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      const next: ThemePreference = prev === "dark" ? "light" : "dark";
      void SecureStore.setItemAsync(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      preference,
      isDark: preference === "dark",
      toggleTheme,
    }),
    [preference, toggleTheme]
  );

  if (!loaded) {
    return <>{children}</>;
  }

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error("useThemePreference must be used inside ThemePreferenceProvider");
  }
  return value;
}

export function useOptionalThemePreference() {
  return useContext(ThemePreferenceContext);
}
