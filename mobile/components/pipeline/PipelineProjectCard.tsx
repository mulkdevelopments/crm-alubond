import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Clock, Pencil, Trash2 } from "lucide-react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { stageTitle } from "@/lib/constants/stages";
import type { ApiProject } from "@/lib/api/projects-api";
import { formatProjectValue } from "@/lib/utils";

export function PipelineProjectCard({
  project,
  viewerRole,
  canEdit,
  canTrash,
  onPress,
  onEdit,
  onTrash,
  onMoveStagePress,
  stageMovesEnabled,
  showCustomer = true,
}: {
  project: ApiProject;
  viewerRole?: string;
  canEdit: boolean;
  canTrash: boolean;
  onPress: () => void;
  onEdit: () => void;
  onTrash: () => void;
  onMoveStagePress: () => void;
  stageMovesEnabled: boolean;
  showCustomer?: boolean;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable style={styles.copy} onPress={onPress}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {project.name}
          </Text>
          <Text style={[styles.meta, { color: colors.text3 }]} numberOfLines={1}>
            {showCustomer
              ? `${project.city} · ${project.developer || "Customer TBD"}`
              : project.city}
          </Text>
        </Pressable>
        <View style={styles.actions}>
          {canEdit ? (
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}
              onPress={onEdit}
              accessibilityLabel={`Edit ${project.name}`}
            >
              <Pencil size={14} color={colors.text3} strokeWidth={2.2} />
            </Pressable>
          ) : null}
          {canTrash ? (
            <Pressable
              style={[styles.iconBtn, { backgroundColor: "rgba(244, 63, 94, 0.08)" }]}
              onPress={onTrash}
              accessibilityLabel={`Move ${project.name} to trash`}
            >
              <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.text }]}>{formatProjectValue(project, viewerRole, true)}</Text>
        <View style={styles.days}>
          <Clock size={12} color={colors.text3} strokeWidth={2.2} />
          <Text style={[styles.daysText, { color: colors.text3 }]}>{project.daysInStage}d</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, project.probability))}%` }]} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: colors.text3 }]}>Manager</Text>
          <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
            {project.managerName || "—"}
          </Text>
        </View>
        <View style={[styles.metaCell, styles.metaCellRight]}>
          <Text style={[styles.metaLabel, { color: colors.text3 }]}>Reps</Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>{project.salesRepNames.length}</Text>
        </View>
      </View>

      <View style={styles.moveStage}>
        <Text style={[styles.moveLabel, { color: colors.text3 }]}>Stage</Text>
        {stageMovesEnabled ? (
          <Pressable
            style={[styles.select, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={onMoveStagePress}
          >
            <Text style={[styles.selectText, { color: colors.text }]}>{stageTitle(project.stage)}</Text>
            <ChevronDown size={14} color={colors.text3} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={[styles.select, styles.selectLocked, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.selectText, { color: colors.text2 }]}>{stageTitle(project.stage)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
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
      letterSpacing: -0.2,
      lineHeight: 18,
    },
    meta: {
      marginTop: 4,
      fontSize: 11,
    },
    actions: {
      flexDirection: "row",
      gap: 4,
    },
    iconBtn: {
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
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    days: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    daysText: {
      fontSize: 10,
      fontWeight: "600",
    },
    progressTrack: {
      marginTop: 6,
      height: 4,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.brand,
      borderRadius: 999,
    },
    metaGrid: {
      marginTop: 10,
      flexDirection: "row",
      gap: 8,
    },
    metaCell: {
      flex: 1,
    },
    metaCellRight: {
      alignItems: "flex-end",
    },
    metaLabel: {
      fontSize: 11,
    },
    metaValue: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
    },
    moveStage: {
      marginTop: 10,
    },
    moveLabel: {
      fontSize: 11,
      marginBottom: 4,
    },
    select: {
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selectText: {
      fontSize: 12,
      fontWeight: "600",
    },
    selectLocked: {
      opacity: 0.85,
    },
  });
}
