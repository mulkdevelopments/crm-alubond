import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { useThemeColors } from "@/constants/theme";
import type { ApiFollowUp } from "@/lib/api/followups-api";
import type { ApiProject } from "@/lib/api/projects-api";
import { STAGE_META } from "@/lib/map/stages";
import { formatAed, formatProjectValue } from "@/lib/utils";

export type KpiDetailKind = "pipeline" | "forecast" | "won" | "overdue";

export function DashboardKpiDetailModal({
  kind,
  activeProjects,
  wonProjects,
  overdueFollowUps,
  viewerRole,
  onClose,
  onOpenProject,
  onViewMore,
}: {
  kind: KpiDetailKind | null;
  activeProjects: ApiProject[];
  wonProjects: ApiProject[];
  overdueFollowUps: ApiFollowUp[];
  viewerRole?: string;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
  onViewMore: (kind: KpiDetailKind) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles();
  const visible = kind !== null;

  const title =
    kind === "pipeline"
      ? "Pipeline value"
      : kind === "forecast"
        ? "Forecast (weighted)"
        : kind === "won"
          ? "Won projects"
          : "Overdue follow-ups";

  const subtitle =
    kind === "pipeline"
      ? `${activeProjects.length} active · ${formatAed(
          activeProjects.reduce((sum, project) => sum + project.valueAed, 0),
          true,
        )}`
      : kind === "forecast"
        ? `${activeProjects.length} active · weighted ${formatAed(
            activeProjects.reduce((sum, project) => sum + (project.valueAed * project.probability) / 100, 0),
            true,
          )}`
        : kind === "won"
          ? `${wonProjects.length} won · ${formatAed(
              wonProjects.reduce((sum, project) => sum + project.valueAed, 0),
              true,
            )}`
          : `${overdueFollowUps.length} overdue`;

  const stageStats =
    kind === "pipeline" || kind === "forecast"
      ? Array.from(
          activeProjects.reduce((acc, project) => {
            const current = acc.get(project.stage) ?? { count: 0, value: 0 };
            current.count += 1;
            current.value +=
              kind === "forecast" ? (project.valueAed * project.probability) / 100 : project.valueAed;
            acc.set(project.stage, current);
            return acc;
          }, new Map<string, { count: number; value: number }>()),
        ).sort((a, b) => b[1].value - a[1].value)
      : [];

  const byLatest = (a: { updatedAt: string }, b: { updatedAt: string }) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  const allProjectRows =
    kind === "won"
      ? [...wonProjects].sort(byLatest)
      : kind === "pipeline" || kind === "forecast"
        ? [...activeProjects].sort(byLatest)
        : [];
  const allOverdueRows = kind === "overdue" ? [...overdueFollowUps].sort(byLatest) : [];

  const projectRows = allProjectRows.slice(0, 10);
  const overdueRows = allOverdueRows.slice(0, 10);
  const totalCount = kind === "overdue" ? allOverdueRows.length : allProjectRows.length;
  const hasMore = totalCount > 10;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.text3 }]}>
                {subtitle}
                {totalCount > 0 ? ` · showing latest ${Math.min(10, totalCount)}` : ""}
              </Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: colors.surface2 }]} onPress={onClose}>
              <X size={16} color={colors.text3} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {kind === "overdue" ? (
              overdueRows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.text3 }]}>No overdue follow-ups.</Text>
              ) : (
                overdueRows.map((followUp) => (
                    <Pressable
                      key={followUp.id}
                      onPress={() => {
                        onClose();
                        onOpenProject(followUp.projectId);
                      }}
                      style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    >
                      <View style={styles.itemHeader}>
                        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                          {followUp.projectName}
                        </Text>
                        <Text style={[styles.due, { color: colors.danger }]}>
                          Due{" "}
                          {new Date(followUp.dueAt).toLocaleDateString("en-AE", {
                            month: "short",
                            day: "2-digit",
                          })}
                        </Text>
                      </View>
                      <Text style={[styles.itemMeta, { color: colors.text3 }]}>
                        {followUp.contact}
                        {followUp.contactRole ? ` · ${followUp.contactRole}` : ""} · {followUp.channel}
                      </Text>
                      {followUp.note?.trim() ? (
                        <Text style={[styles.itemBody, { color: colors.text2 }]} numberOfLines={2}>
                          {followUp.note}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
              )
            ) : projectRows.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text3 }]}>
                {kind === "won" ? "No won projects yet." : "No active pipeline projects."}
              </Text>
            ) : (
              <>
                {stageStats.length > 0 ? (
                  <View style={[styles.legendBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                    <Text style={[styles.legendTitle, { color: colors.text }]}>By stage</Text>
                    <View style={styles.legendGrid}>
                      {stageStats.map(([stage, stats]) => (
                        <View
                          key={stage}
                          style={[styles.legendItem, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        >
                          <Text style={[styles.legendStage, { color: colors.text }]}>{stage}</Text>
                          <Text style={[styles.legendMeta, { color: colors.text3 }]}>
                            {stats.count} project(s) · {formatAed(stats.value, true)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {projectRows.map((project) => {
                  const weighted = (project.valueAed * project.probability) / 100;
                  const stageColor = STAGE_META[project.stage]?.color ?? colors.text3;
                  return (
                    <Pressable
                      key={project.id}
                      onPress={() => {
                        onClose();
                        onOpenProject(project.id);
                      }}
                      style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    >
                      <View style={styles.itemHeader}>
                        <View style={styles.itemCopy}>
                          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                            {project.name}
                          </Text>
                          <Text style={[styles.itemMeta, { color: colors.text3 }]}>
                            {[project.city, project.country].filter(Boolean).join(", ") || "No location"}
                          </Text>
                          {kind === "forecast" ? (
                            <View style={[styles.probPill, { backgroundColor: "rgba(227,6,19,0.12)" }]}>
                              <Text style={[styles.probPillText, { color: colors.brand }]}>
                                {project.probability}%
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.valueCol}>
                          <View style={[styles.stagePill, { backgroundColor: `${stageColor}22` }]}>
                            <Text style={[styles.stagePillText, { color: stageColor }]}>{project.stage}</Text>
                          </View>
                          <Text style={[styles.value, { color: colors.text }]}>
                            {kind === "forecast"
                              ? formatAed(weighted, true)
                              : formatProjectValue(project, viewerRole, true)}
                          </Text>
                          {kind === "forecast" ? (
                            <Text style={[styles.valueHint, { color: colors.text3 }]}>
                              of {formatProjectValue(project, viewerRole, true)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {hasMore && kind ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onViewMore(kind);
                }}
                style={[styles.viewMore, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
              >
                <Text style={[styles.viewMoreText, { color: colors.brand }]}>
                  View more ({totalCount - 10} more)
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "88%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 16,
      gap: 10,
      paddingBottom: 28,
    },
    empty: {
      fontSize: 14,
      paddingVertical: 12,
    },
    legendBox: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      marginBottom: 4,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: "700",
    },
    legendGrid: {
      marginTop: 8,
      gap: 8,
    },
    legendItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    legendStage: {
      fontSize: 12,
      fontWeight: "700",
    },
    legendMeta: {
      marginTop: 2,
      fontSize: 11,
    },
    item: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },
    itemCopy: {
      flex: 1,
      minWidth: 0,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },
    itemMeta: {
      marginTop: 2,
      fontSize: 12,
    },
    probPill: {
      alignSelf: "flex-start",
      marginTop: 6,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    probPillText: {
      fontSize: 11,
      fontWeight: "800",
    },
    itemBody: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
    },
    due: {
      fontSize: 11,
      fontWeight: "600",
    },
    valueCol: {
      alignItems: "flex-end",
      gap: 4,
      maxWidth: "46%",
    },
    stagePill: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    stagePillText: {
      fontSize: 10,
      fontWeight: "700",
    },
    value: {
      fontSize: 12,
      fontWeight: "700",
    },
    valueHint: {
      fontSize: 10,
    },
    viewMore: {
      marginTop: 6,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    viewMoreText: {
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
