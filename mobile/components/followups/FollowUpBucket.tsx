import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useThemeColors } from "@/constants/theme";

type BucketTone = "danger" | "warning" | "success";

const toneStyles: Record<
  BucketTone,
  { bg: string; border: string; dot: string; text: string }
> = {
  danger: {
    bg: "rgba(244, 63, 94, 0.08)",
    border: "rgba(244, 63, 94, 0.2)",
    dot: "#F43F5E",
    text: "#BE123C",
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.2)",
    dot: "#F59E0B",
    text: "#B45309",
  },
  success: {
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.2)",
    dot: "#10B981",
    text: "#047857",
  },
};

export function FollowUpBucket({
  count,
  title,
  subtitle,
  tone,
  icon,
}: {
  count: number;
  title: string;
  subtitle: string;
  tone: BucketTone;
  icon: ReactNode;
}) {
  const colors = useThemeColors();
  const palette = toneStyles[tone];

  return (
    <Card
      style={{
        ...styles.card,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: palette.dot }]} />
            <Text style={[styles.label, { color: colors.text3 }]}>{title.toUpperCase()}</Text>
          </View>
          <Text style={[styles.count, { color: palette.text }]}>{count}</Text>
          <Text style={[styles.subtitle, { color: colors.text3 }]}>{subtitle}</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {icon}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  count: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
