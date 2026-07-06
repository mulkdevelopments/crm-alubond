import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useThemeColors } from "@/constants/theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function CardHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  action,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  action?: ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.text3 }]}>{subtitle}</Text> : null}
      </View>
      {action ? action : null}
      {!action && actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text style={[styles.action, { color: colors.brand }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  action: {
    fontSize: 12,
    fontWeight: "600",
  },
});
