import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LocateFixed, X } from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { mapStageLabel, stageTone } from "@/lib/map/stages";
import type { ApiProject, ProjectActivity } from "@/lib/api/projects-api";
import { formatProjectValue } from "@/lib/utils";

export function MapMobileProjectSheet({
  project,
  viewerRole,
  latestActivity,
  onClose,
  onFocus,
}: {
  project: ApiProject;
  viewerRole?: string;
  latestActivity: ProjectActivity | null;
  onClose: () => void;
  onFocus: () => void;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = createStyles(colors);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {project.name}
            </Text>
            <Text style={[styles.meta, { color: colors.text2 }]} numberOfLines={1}>
              {project.city}, {project.country}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close project preview">
            <X size={16} color={colors.text3} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.valueRow}>
          <Badge tone={stageTone(project.stage)}>{mapStageLabel(project.stage)}</Badge>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatProjectValue(project, viewerRole, true)}
          </Text>
        </View>

        {latestActivity ? (
          <Text style={[styles.activity, { color: colors.text3 }]} numberOfLines={2}>
            <Text style={{ fontWeight: "600", color: colors.text }}>
              {latestActivity.type} · {latestActivity.createdByName ?? "System"}
            </Text>
            {" — "}
            {latestActivity.message.split("\n")[0] || "Activity logged."}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={onFocus}>
            <LocateFixed size={14} color="#fff" strokeWidth={2.2} />
            <Text style={styles.primaryBtnText}>Focus</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/project/${project.id}`)}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.brand }]}>Open</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 0,
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 999,
      marginTop: 8,
      marginBottom: 4,
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      maxHeight: 220,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
    },
    meta: {
      marginTop: 2,
      fontSize: 12,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    valueRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    value: {
      fontSize: 12,
      fontWeight: "700",
    },
    activity: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 16,
    },
    actions: {
      marginTop: 12,
      flexDirection: "row",
      gap: 8,
    },
    primaryBtn: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    secondaryBtn: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
