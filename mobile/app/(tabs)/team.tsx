import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react-native";

import { ScreenLoader } from "@/components/ScreenLoader";
import { PerformanceCard } from "@/components/team/PerformanceCard";
import { TeamPipelineModal, TeamVisitModal } from "@/components/team/TeamDetailModals";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listUsers } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { listProjectActivities, listProjects, type ApiProject } from "@/lib/api/projects-api";
import {
  buildHierarchy,
  type FlatActivity,
  type ManagerCard,
  type RegionalCard,
  type SalesRepCard,
} from "@/lib/team-performance";

type CardOwner = {
  name: string;
  location: string;
  metrics: RegionalCard["metrics"];
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
  online?: boolean;
};

export default function TeamScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [activities, setActivities] = useState<FlatActivity[]>([]);
  const [selectedRegionalId, setSelectedRegionalId] = useState<string | null>(null);
  const [visitPopup, setVisitPopup] = useState<{ ownerName: string; visits: FlatActivity[] } | null>(null);
  const [pipelinePopup, setPipelinePopup] = useState<{ ownerName: string; projects: ApiProject[] } | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError(null);
    const [usersData, projectsData] = await Promise.all([listUsers(token), listProjects(token)]);
    const activityBuckets = await Promise.all(
      projectsData.map(async (project) => {
        try {
          const items = await listProjectActivities(token, project.id);
          return items.map(
            (item): FlatActivity => ({
              id: item.id,
              projectId: item.projectId,
              type: item.type,
              message: item.message,
              visitWhatHappened: item.visitWhatHappened,
              createdById: item.createdById,
              createdByName: item.createdByName,
              createdAt: item.createdAt,
            }),
          );
        } catch {
          return [] as FlatActivity[];
        }
      }),
    );
    setProjects(projectsData);
    setActivities(activityBuckets.flat());
    return usersData;
  }, [token]);

  const [usersSnapshot, setUsersSnapshot] = useState<Awaited<ReturnType<typeof listUsers>>>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const usersData = await loadData();
        if (usersData) setUsersSnapshot(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team performance");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const hierarchy = useMemo(
    () => buildHierarchy(usersSnapshot, projects, activities),
    [usersSnapshot, projects, activities],
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);

  const selectedRegional = useMemo(
    () => hierarchy.find((regional) => regional.id === selectedRegionalId) ?? null,
    [hierarchy, selectedRegionalId],
  );

  const view = selectedRegional ? "regional-focus" : "regionals";
  const cards = view === "regionals" ? hierarchy : selectedRegional ? [selectedRegional] : [];
  const bestPerformerId = useMemo(() => {
    const sorted = [...cards].sort((a, b) => b.metrics.attainmentPct - a.metrics.attainmentPct);
    return sorted[0]?.id ?? null;
  }, [cards]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const usersData = await loadData();
      if (usersData) setUsersSnapshot(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team performance");
    } finally {
      setRefreshing(false);
    }
  }

  function renderCard(
    card: CardOwner & { id: string },
    options: {
      topPerformer: boolean;
      hideTeamPerformance?: boolean;
      onPress?: () => void;
    },
  ) {
    return (
      <PerformanceCard
        name={card.name}
        location={card.location}
        metrics={card.metrics}
        topPerformer={options.topPerformer}
        isYou={user?.id === card.id}
        online={card.online}
        hideTeamPerformance={options.hideTeamPerformance}
        onPress={options.onPress}
        onPipelinePress={() =>
          setPipelinePopup({ ownerName: card.name, projects: card.pipelineProjects })
        }
        onVisitsPress={() => setVisitPopup({ ownerName: card.name, visits: card.visits })}
      />
    );
  }

  if (loading) return <ScreenLoader label="Loading team performance..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader eyebrow="Team Performance" title="CEO → regional → manager → sales cards" />

        {error ? (
          <Card style={styles.errorCard}>
            <View style={styles.errorRow}>
              <AlertTriangle size={16} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.navRow}>
          <Pressable
            style={[
              styles.backButton,
              { borderColor: colors.border, backgroundColor: colors.surface2 },
              view === "regionals" && styles.backButtonDisabled,
            ]}
            disabled={view === "regionals"}
            onPress={() => setSelectedRegionalId(null)}
          >
            <ChevronLeft size={14} color={colors.text2} strokeWidth={2.2} />
            <Text style={[styles.backButtonText, { color: colors.text2 }]}>Back</Text>
          </Pressable>
          <Text style={[styles.navLabel, { color: colors.text2 }]}>
            {view === "regionals"
              ? "All regional managers"
              : `${selectedRegional?.name ?? "Regional"} · full hierarchy`}
          </Text>
        </View>

        {!loading && cards.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>
              No hierarchy data available for your role scope.
            </Text>
          </Card>
        ) : null}

        {view === "regionals" ? (
          <View style={styles.cardGrid}>
            {cards.map((card) => (
              <View key={card.id}>
                {renderCard(card as RegionalCard, {
                  topPerformer: card.id === bestPerformerId,
                  onPress: () => setSelectedRegionalId(card.id),
                })}
              </View>
            ))}
          </View>
        ) : selectedRegional ? (
          <View style={styles.focusStack}>
            {renderCard(selectedRegional, { topPerformer: selectedRegional.id === bestPerformerId })}

            <View style={[styles.tree, { borderLeftColor: colors.border }]}>
              {selectedRegional.managers.map((manager: ManagerCard) => (
                <View key={`manager-node-${manager.id}`} style={styles.treeSection}>
                  <View style={styles.treeLabel}>
                    <ChevronRight size={14} color={colors.text3} strokeWidth={2.2} />
                    <Text style={[styles.treeLabelText, { color: colors.text3 }]}>
                      {manager.id.startsWith("regional-direct-") ? "Direct reports" : "Manager"}
                    </Text>
                  </View>
                  {renderCard(manager, { topPerformer: false })}

                  <View style={[styles.tree, { borderLeftColor: colors.border }]}>
                    {manager.reps.length === 0 ? (
                      <Text style={[styles.noReps, { color: colors.text3 }]}>No sales reps assigned.</Text>
                    ) : (
                      manager.reps.map((rep: SalesRepCard) => (
                        <View key={`rep-node-${rep.id}`} style={styles.treeSection}>
                          <View style={styles.treeLabel}>
                            <ChevronRight size={14} color={colors.text3} strokeWidth={2.2} />
                            <Text style={[styles.treeLabelText, { color: colors.text3 }]}>Sales rep</Text>
                          </View>
                          {renderCard(rep, { topPerformer: false, hideTeamPerformance: true })}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <TeamVisitModal
        visible={Boolean(visitPopup)}
        ownerName={visitPopup?.ownerName ?? ""}
        visits={visitPopup?.visits ?? []}
        projectNameById={projectNameById}
        onClose={() => setVisitPopup(null)}
      />

      <TeamPipelineModal
        visible={Boolean(pipelinePopup)}
        ownerName={pipelinePopup?.ownerName ?? ""}
        projects={pipelinePopup?.projects ?? []}
        viewerRole={user?.role}
        onClose={() => setPipelinePopup(null)}
      />
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
      gap: 16,
    },
    errorCard: {
      padding: 16,
      borderColor: "rgba(244, 63, 94, 0.3)",
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
    },
    navRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    backButton: {
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    backButtonDisabled: {
      opacity: 0.4,
    },
    backButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    navLabel: {
      flex: 1,
      fontSize: 12,
      minWidth: 180,
    },
    emptyCard: {
      padding: 16,
    },
    emptyText: {
      fontSize: 14,
    },
    cardGrid: {
      gap: 12,
    },
    focusStack: {
      gap: 12,
    },
    tree: {
      marginLeft: 8,
      paddingLeft: 12,
      borderLeftWidth: 1,
      borderStyle: "dashed",
      gap: 12,
    },
    treeSection: {
      gap: 8,
    },
    treeLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    treeLabelText: {
      fontSize: 11,
    },
    noReps: {
      fontSize: 12,
    },
  });
}
