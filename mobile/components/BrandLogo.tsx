import { Image, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useThemeColors } from "@/constants/theme";
import { useOptionalThemePreference } from "@/lib/theme/ThemePreferenceContext";

const MARK_SIZES = {
  sm: 32,
  md: 36,
  lg: 48,
  xl: 80,
} as const;

type BrandMarkProps = {
  size?: keyof typeof MARK_SIZES;
};

export function BrandMark({ size = "md" }: BrandMarkProps) {
  const themePreference = useOptionalThemePreference();
  const systemScheme = useColorScheme();
  const isDark = themePreference?.isDark ?? systemScheme === "dark";
  const px = MARK_SIZES[size];
  const source = isDark
    ? require("@/assets/images/brand/logo-mark-light.png")
    : require("@/assets/images/brand/logo-mark.png");

  return (
    <View style={[styles.wrap, { width: px, height: px }]}>
      <Image source={source} style={styles.image} resizeMode="contain" accessibilityLabel="Alubond" />
    </View>
  );
}

type BrandLogoProps = {
  markSize?: keyof typeof MARK_SIZES;
  showWordmark?: boolean;
};

export function BrandLogo({ markSize = "lg", showWordmark = true }: BrandLogoProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.row, showWordmark && styles.rowWithWordmark]}>
      <BrandMark size={markSize} />
      {showWordmark ? (
        <View style={styles.wordmark}>
          <Text style={[styles.title, { color: colors.text }]}>Alubond</Text>
          <Text style={[styles.subtitle, { color: colors.text3 }]}>Sales Intelligence</Text>
        </View>
      ) : null}
    </View>
  );
}

export function AuthBrandHeader() {
  const colors = useThemeColors();
  return (
    <View style={styles.authHeader}>
      <BrandMark size="xl" />
      <Text style={[styles.authTitle, { color: colors.text }]}>Alubond</Text>
      <Text style={[styles.authSubtitle, { color: colors.text3 }]}>Sales Intelligence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  row: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowWithWordmark: {
    flexDirection: "row",
    gap: 10,
  },
  wordmark: {
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  authHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  authSubtitle: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
