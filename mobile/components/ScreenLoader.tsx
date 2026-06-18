import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";

export function ScreenLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  label: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
