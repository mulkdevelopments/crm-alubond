import { useColorScheme } from "react-native";

import { useOptionalThemePreference } from "@/lib/theme/ThemePreferenceContext";

export const brandColors = {
  600: "#E30613",
  700: "#BE0411",
} as const;

const palette = {
  light: {
    bg: "#FAFAFA",
    surface: "#FFFFFF",
    surface2: "#F4F4F5",
    border: "rgba(0, 0, 0, 0.06)",
    text: "#18181B",
    text2: "#54545C",
    text3: "#8E8E96",
  },
  dark: {
    bg: "#0A0A0B",
    surface: "#131316",
    surface2: "#1B1B1F",
    border: "rgba(255, 255, 255, 0.06)",
    text: "#F4F4F5",
    text2: "#B7B7BD",
    text3: "#6E6E76",
  },
} as const;

export type ThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  brand: string;
  brandDark: string;
  success: string;
  danger: string;
};

export function useThemeColors(): ThemeColors {
  const systemScheme = useColorScheme();
  const themePreference = useOptionalThemePreference();
  const scheme = themePreference?.preference ?? (systemScheme === "dark" ? "dark" : "light");
  const base = scheme === "dark" ? palette.dark : palette.light;
  return {
    ...base,
    brand: brandColors[600],
    brandDark: brandColors[700],
    success: "#059669",
    danger: "#ef4444",
  };
}

/** @deprecated Prefer useThemeColors() for dark mode support */
export const colors = {
  brand: brandColors[600],
  brandDark: brandColors[700],
  background: palette.light.surface,
  surface: palette.light.surface2,
  border: palette.light.border,
  text: palette.light.text,
  textMuted: palette.light.text3,
  success: "#059669",
  warning: "#d97706",
  danger: "#ef4444",
};
