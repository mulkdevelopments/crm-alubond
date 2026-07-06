import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import type { ApiProject } from "@/lib/api/projects-api";
import type { FlatActivity } from "@/lib/team-performance";
import { formatAed, formatProjectValue } from "@/lib/utils";

export function TeamVisitModal({
  visible,
  ownerName,
  visits,
  projectNameById,
  onClose,
}: {
  visible: boolean;
  ownerName: string;
  visits: FlatActivity[];
  projectNameById: Map<string, string>;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>{ownerName} · Visit details</Text>
              <Text style={[styles.subtitle, { color: colors.text3 }]}>{visits.length} total visit record(s)</Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: colors.surface2 }]} onPress={onClose}>
              <X size={16} color={colors.text3} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {visits.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text3 }]}>No visits recorded.</Text>
            ) : (
              [...visits]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((visit) => (
                  <View
                    key={visit.id}
                    style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {projectNameById.get(visit.projectId) ?? "Project"}
                      </Text>
                      <Text style={[styles.itemTime, { color: colors.text3 }]}>
                        {new Date(visit.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={[styles.itemMeta, { color: colors.text3 }]}>
                      By: {visit.createdByName ?? "Unknown user"}
                    </Text>
                    <Text style={[styles.itemBody, { color: colors.text2 }]}>
                      {visit.visitWhatHappened?.trim() || visit.message?.trim() || "No visit note provided."}
                    </Text>
                  </View>
                ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function TeamPipelineModal({
  visible,
  ownerName,
  projects,
  viewerRole,
  onClose,
}: {
  visible: boolean;
  ownerName: string;
  projects: ApiProject[];
  viewerRole?: string;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const totalValue = projects.reduce((sum, project) => sum + project.valueAed, 0);

  const stageLegend = Array.from(
    projects.reduce((acc, project) => {
      const current = acc.get(project.stage) ?? { count: 0, value: 0 };
      current.count += 1;
      current.value += project.valueAed;
      acc.set(project.stage, current);
      return acc;
    }, new Map<string, { count: number; value: number }>()),
  ).sort((a, b) => b[1].value - a[1].value);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>{ownerName} · Pipeline details</Text>
              <Text style={[styles.subtitle, { color: colors.text3 }]}>
                {projects.length} active project(s) · {formatAed(totalValue, true)}
              </Text>
            </View>
            <Pressable style={[styles.closeButton, { backgroundColor: colors.surface2 }]} onPress={onClose}>
              <X size={16} color={colors.text3} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {projects.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text3 }]}>No active pipeline projects.</Text>
            ) : (
              <>
                <View style={[styles.legendBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.legendTitle, { color: colors.text }]}>Legend by stage</Text>
                  <View style={styles.legendGrid}>
                    {stageLegend.map(([stage, stats]) => (
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

                {[...projects]
                  .sort((a, b) => b.valueAed - a.valueAed)
                  .map((project) => (
                    <View
                      key={project.id}
                      style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                    >
                      <View style={styles.pipelineRow}>
                        <View style={styles.pipelineMain}>
                          <Text style={[styles.itemTitle, { color: colors.text }]}>{project.name}</Text>
                          <Text style={[styles.itemMeta, { color: colors.text3 }]}>
                            {project.stage} · {project.city}, {project.country}
                          </Text>
                        </View>
                        <Text style={[styles.pipelineValue, { color: colors.text }]}>
                          {formatProjectValue(project, viewerRole, true)}
                        </Text>
                      </View>
                    </View>
                  ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
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
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
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
      marginTop: 4,
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
      paddingBottom: 32,
      gap: 10,
    },
    empty: {
      fontSize: 14,
      textAlign: "center",
      paddingVertical: 24,
    },
    item: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    itemTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
    },
    itemTime: {
      fontSize: 11,
    },
    itemMeta: {
      fontSize: 12,
    },
    itemBody: {
      fontSize: 14,
      lineHeight: 20,
    },
    legendBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: "700",
    },
    legendGrid: {
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
    pipelineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    pipelineMain: {
      flex: 1,
      minWidth: 0,
    },
    pipelineValue: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
