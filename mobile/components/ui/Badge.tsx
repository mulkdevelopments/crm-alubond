import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral" | "info";

const toneStyles: Record<BadgeTone, { bg: string; text: string; border: string }> = {
  brand: { bg: "rgba(227, 6, 19, 0.12)", text: "#E30613", border: "rgba(227, 6, 19, 0.2)" },
  success: { bg: "rgba(16, 185, 129, 0.12)", text: "#059669", border: "rgba(16, 185, 129, 0.2)" },
  warning: { bg: "rgba(245, 158, 11, 0.12)", text: "#d97706", border: "rgba(245, 158, 11, 0.2)" },
  danger: { bg: "rgba(244, 63, 94, 0.12)", text: "#e11d48", border: "rgba(244, 63, 94, 0.2)" },
  neutral: { bg: "rgba(244, 244, 245, 1)", text: "#54545C", border: "rgba(0, 0, 0, 0.06)" },
  info: { bg: "rgba(14, 165, 233, 0.12)", text: "#0284C7", border: "rgba(14, 165, 233, 0.2)" },
};

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: BadgeTone }) {
  const palette = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.text, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
