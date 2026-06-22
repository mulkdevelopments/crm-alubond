import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { formatAed, formatStage, stageColor } from "@/lib/utils";
import type { ApiProject } from "@/lib/api/projects-api";

export function ProjectCard({
  project,
  onPress,
  trailing,
}: {
  project: ApiProject;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} onPress={onPress}>
            {project.name}
          </Text>
          <Text style={styles.meta}>
            {project.city} · {project.developer || "Customer TBD"}
          </Text>
        </View>
        {trailing}
      </View>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: stageColor(project.stage) }]}>
          <Text style={styles.badgeText}>{formatStage(project.stage)}</Text>
        </View>
        <Text style={styles.value}>{formatAed(project.valueAed, true)}</Text>
      </View>
      <Text style={styles.owner}>Owner: {project.owner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  row: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  value: { fontSize: 14, fontWeight: "700", color: colors.text },
  owner: { marginTop: 8, fontSize: 11, color: colors.textMuted },
});
