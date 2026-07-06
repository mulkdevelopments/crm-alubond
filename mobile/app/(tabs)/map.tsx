import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react-native";

import { MapInteractionOverlay } from "@/components/map/MapInteractionOverlay";
import { MapMobileProjectSheet } from "@/components/map/MapMobileProjectSheet";
import { ProjectMapMarker } from "@/components/map/ProjectMapMarker";
import { ScreenLoader } from "@/components/ScreenLoader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  STAGE_LEGEND_ORDER,
  mapStageLabel,
  markerColor,
  stageTone,
} from "@/lib/map/stages";
import {
  listProjectActivities,
  listProjects,
  type ApiProject,
  type ProjectActivity,
} from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatAed, formatProjectValue } from "@/lib/utils";

const DEFAULT_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 80,
};

export default function MapScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { token, user } = useAuth();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [latestActivityByProjectId, setLatestActivityByProjectId] = useState<
    Record<string, ProjectActivity | null>
  >({});
  const [recentActivitiesByProjectId, setRecentActivitiesByProjectId] = useState<
    Record<string, ProjectActivity[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [mobileMapProjectId, setMobileMapProjectId] = useState<string | null>(null);
  const [mapActive, setMapActive] = useState(false);

  const validProjects = useMemo(
    () => projects.filter((project) => Number.isFinite(project.lat) && Number.isFinite(project.lng)),
    [projects],
  );

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of validProjects) {
      counts.set(project.stage, (counts.get(project.stage) ?? 0) + 1);
    }
    return counts;
  }, [validProjects]);

  const filteredProjects = useMemo(() => {
    if (!stageFilter) return validProjects;
    return validProjects.filter((project) => project.stage === stageFilter);
  }, [validProjects, stageFilter]);

  const overviewRegion = useMemo<Region>(() => {
    if (filteredProjects.length === 0) return DEFAULT_REGION;
    const avgLat = filteredProjects.reduce((sum, project) => sum + project.lat, 0) / filteredProjects.length;
    const avgLng = filteredProjects.reduce((sum, project) => sum + project.lng, 0) / filteredProjects.length;
    return {
      latitude: avgLat,
      longitude: avgLng,
      latitudeDelta: 40,
      longitudeDelta: 40,
    };
  }, [filteredProjects]);

  const stats = useMemo(() => {
    const won = projects.filter((project) => project.stage === "Won");
    const lost = projects.filter((project) => project.stage === "Lost");
    const inPlay = projects.filter((project) => project.stage !== "Won" && project.stage !== "Lost");
    return {
      total: projects.length,
      inPlay: inPlay.length,
      won: won.length,
      lost: lost.length,
      totalValue: inPlay.reduce((sum, project) => sum + project.valueAed, 0),
    };
  }, [projects]);

  const focusedProject = useMemo(
    () => validProjects.find((project) => project.id === focusedProjectId) ?? null,
    [validProjects, focusedProjectId],
  );
  const mobileMapProject = useMemo(
    () => validProjects.find((project) => project.id === mobileMapProjectId) ?? null,
    [validProjects, mobileMapProjectId],
  );
  const focusedProjectUpdates = focusedProject
    ? (recentActivitiesByProjectId[focusedProject.id] ?? [])
    : [];

  const loadProjects = useCallback(async () => {
    if (!token) {
      setProjects([]);
      return;
    }
    setError(null);
    const data = await listProjects(token);
    setProjects(data);

    const activityBuckets = await Promise.all(
      data.map(async (project) => {
        try {
          const items = await listProjectActivities(token, project.id);
          if (items.length === 0) return [project.id, null] as const;
          const latest =
            items
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
          return [project.id, latest] as const;
        } catch {
          return [project.id, null] as const;
        }
      }),
    );
    setLatestActivityByProjectId(Object.fromEntries(activityBuckets));

    const recentBuckets = await Promise.all(
      data.map(async (project) => {
        try {
          const items = await listProjectActivities(token, project.id);
          const recent = items
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4);
          return [project.id, recent] as const;
        } catch {
          return [project.id, []] as const;
        }
      }),
    );
    setRecentActivitiesByProjectId(Object.fromEntries(recentBuckets));
    setFocusedProjectId((current) => current ?? data[0]?.id ?? null);
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadProjects();
      } catch {
        setError("Failed to load project map data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProjects]);

  useEffect(() => {
    mapRef.current?.animateToRegion(overviewRegion, 500);
  }, [overviewRegion]);

  function focusProject(project: ApiProject) {
    mapRef.current?.animateToRegion(
      {
        latitude: project.lat,
        longitude: project.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      800,
    );
    setFocusedProjectId(project.id);
  }

  function handleMarkerPress(project: ApiProject) {
    focusProject(project);
    setMobileMapProjectId(project.id);
  }

  function resetMapView() {
    mapRef.current?.animateToRegion(overviewRegion, 800);
    setFocusedProjectId(null);
    setMobileMapProjectId(null);
    setMapActive(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadProjects();
    } catch {
      setError("Failed to load project map data.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <ScreenLoader label="Loading map..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <PageHeader title="Live coverage map" />
          </View>
          <Pressable
            style={[styles.refreshBtn, { backgroundColor: colors.brand }]}
            onPress={() => void onRefresh()}
          >
            <RefreshCw size={14} color="#fff" strokeWidth={2.2} />
            <Text style={styles.refreshBtnText}>Refresh map</Text>
          </Pressable>
        </View>

        <Card>
          <View style={[styles.mapHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.mapHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Project markers by stage</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.text3 }]}>
                Tap markers for value, stage, and quick map focus.
              </Text>
            </View>
            <Badge tone="brand">{`${stats.total} projects`}</Badge>
          </View>

          <View style={styles.statsGrid}>
            <StatTile label="In play" value={String(stats.inPlay)} colors={colors} />
            <StatTile label="Won" value={String(stats.won)} colors={colors} valueColor={colors.success} />
            <StatTile label="Lost" value={String(stats.lost)} colors={colors} valueColor={colors.danger} />
            <StatTile label="Pipeline value" value={formatAed(stats.totalValue, true)} colors={colors} />
          </View>

          <View style={styles.mapWrapOuter}>
            <View style={[styles.mapWrap, { borderColor: colors.border }]}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={overviewRegion}
                scrollEnabled={mapActive}
                zoomEnabled={mapActive}
                pitchEnabled={mapActive}
                rotateEnabled={mapActive}
              >
                {filteredProjects.map((project) => (
                  <ProjectMapMarker
                    key={project.id}
                    project={project}
                    onPress={() => handleMarkerPress(project)}
                  />
                ))}
              </MapView>

              <Pressable
                style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={resetMapView}
              >
                <RotateCcw size={14} color={colors.text2} strokeWidth={2.2} />
              </Pressable>

              <MapInteractionOverlay
                active={mapActive}
                onActivate={() => setMapActive(true)}
                onDeactivate={() => setMapActive(false)}
                bottomOffset={mobileMapProject ? 176 : 0}
              />

              {mobileMapProject ? (
                <MapMobileProjectSheet
                  project={mobileMapProject}
                  viewerRole={user?.role}
                  latestActivity={latestActivityByProjectId[mobileMapProject.id] ?? null}
                  onClose={() => setMobileMapProjectId(null)}
                  onFocus={() => {
                    focusProject(mobileMapProject);
                    setMobileMapProjectId(null);
                  }}
                />
              ) : null}
            </View>
          </View>
        </Card>

        {focusedProject ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Focused project details</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text3 }]}>Shown after “Go to location”</Text>

            <View style={[styles.detailBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.detailName, { color: colors.text }]}>{focusedProject.name}</Text>
              <Text style={[styles.detailMeta, { color: colors.text3 }]}>
                {focusedProject.city}, {focusedProject.country}
              </Text>
              <View style={styles.detailRow}>
                <Badge tone={stageTone(focusedProject.stage)}>
                  {mapStageLabel(focusedProject.stage)}
                </Badge>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatProjectValue(focusedProject, user?.role, true)}
                </Text>
              </View>
            </View>

            <View style={[styles.detailBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.boxTitle, { color: colors.text }]}>Field team</Text>
              <Text style={[styles.boxLine, { color: colors.text3 }]}>
                Manager:{" "}
                <Text style={{ color: colors.text, fontWeight: "600" }}>{focusedProject.managerName}</Text>
              </Text>
              <Text style={[styles.boxLine, { color: colors.text3 }]}>
                Sales reps:{" "}
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {focusedProject.salesRepNames.join(", ") || "Not assigned"}
                </Text>
              </Text>
            </View>

            <View style={[styles.detailBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.boxTitle, { color: colors.text }]}>Latest updates</Text>
              {focusedProjectUpdates.length === 0 ? (
                <Text style={[styles.boxLine, { color: colors.text3 }]}>No updates yet.</Text>
              ) : (
                focusedProjectUpdates.map((activity) => (
                  <View
                    key={activity.id}
                    style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.activityTitle, { color: colors.text }]}>
                      {activity.type} · {activity.createdByName ?? "System"}
                    </Text>
                    <Text style={[styles.activityBody, { color: colors.text3 }]} numberOfLines={2}>
                      {activity.message.split("\n")[0] || "Activity logged."}
                    </Text>
                    <Text style={[styles.activityWhen, { color: colors.text3 }]}>
                      {new Date(activity.createdAt).toLocaleString("en-AE")}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <View style={styles.legendHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Stage legend</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.text3 }]}>
                Tap a stage to filter map markers
              </Text>
            </View>
            <Pressable onPress={() => setStageFilter(null)}>
              <Text style={[styles.showAll, { color: colors.brand }]}>Show all</Text>
            </Pressable>
          </View>

          <View style={styles.legendList}>
            {STAGE_LEGEND_ORDER.map((stage) => {
              const active = stageFilter === stage;
              const count = stageCounts.get(stage) ?? 0;
              const color = markerColor(stage);
              return (
                <Pressable
                  key={stage}
                  style={[
                    styles.legendRow,
                    {
                      borderColor: active ? color : colors.border,
                      backgroundColor: active ? colors.surface : colors.surface2,
                    },
                  ]}
                  onPress={() => setStageFilter((current) => (current === stage ? null : stage))}
                >
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={[styles.legendLabel, { color: colors.text }]}>{mapStageLabel(stage)}</Text>
                  </View>
                  <Text style={[styles.legendCount, { color: colors.text }]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          {stageFilter ? (
            <Text style={[styles.filterHint, { color: colors.text2 }]}>
              Showing only: <Text style={{ fontWeight: "700" }}>{mapStageLabel(stageFilter)}</Text>
            </Text>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pipeline geo summary</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text3 }]}>Live from persisted project records</Text>
          <SummaryRow label="Total projects" value={String(stats.total)} colors={colors} />
          <SummaryRow label="In pipeline" value={String(stats.inPlay)} colors={colors} />
          <SummaryRow label="Won" value={String(stats.won)} colors={colors} valueColor={colors.success} />
          <SummaryRow label="Lost" value={String(stats.lost)} colors={colors} valueColor={colors.danger} />
          <SummaryRow
            label="Pipeline value"
            value={formatAed(stats.totalValue, true)}
            colors={colors}
            last
          />
          {error ? (
            <View style={styles.errorRow}>
              <AlertTriangle size={14} color={colors.danger} strokeWidth={2.2} />
              <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
            </View>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Recent mapped projects" subtitle="Latest from backend" />
          <View style={styles.recentList}>
            {validProjects.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                No projects with valid coordinates yet.
              </Text>
            ) : (
              validProjects.slice(0, 6).map((project) => (
                <Pressable
                  key={project.id}
                  style={[styles.recentItem, { backgroundColor: colors.surface2 }]}
                  onPress={() => router.push(`/project/${project.id}`)}
                >
                  <View style={styles.recentCopy}>
                    <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.text3 }]} numberOfLines={1}>
                      {project.city}, {project.country}
                    </Text>
                    <Text style={[styles.recentStage, { color: colors.text3 }]}>
                      {mapStageLabel(project.stage)}
                    </Text>
                  </View>
                  <Text style={[styles.recentValue, { color: colors.text }]}>
                    {formatProjectValue(project, user?.role, true)}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function StatTile({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  valueColor?: string;
}) {
  return (
    <View style={[stylesStatic.statTile, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Text style={[stylesStatic.statLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[stylesStatic.statValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        stylesStatic.summaryRow,
        !last && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <Text style={[stylesStatic.summaryLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[stylesStatic.summaryValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  statTile: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 10,
  },
  statValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
});

function createStyles(colors: ThemeColors) {
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
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    refreshBtn: {
      height: 32,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    refreshBtnText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    mapHeader: {
      padding: 16,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    mapHeaderCopy: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      marginTop: 2,
      fontSize: 12,
    },
    statsGrid: {
      paddingHorizontal: 16,
      paddingTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    mapWrapOuter: {
      padding: 16,
    },
    mapWrap: {
      height: 280,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      position: "relative",
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    resetBtn: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 31,
    },
    sectionCard: {
      padding: 16,
      gap: 12,
    },
    detailBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    detailName: {
      fontSize: 14,
      fontWeight: "700",
    },
    detailMeta: {
      fontSize: 12,
    },
    detailRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: "700",
    },
    boxTitle: {
      fontSize: 12,
      fontWeight: "700",
    },
    boxLine: {
      fontSize: 11,
      lineHeight: 16,
    },
    activityCard: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    activityTitle: {
      fontSize: 11,
      fontWeight: "700",
    },
    activityBody: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 15,
    },
    activityWhen: {
      marginTop: 4,
      fontSize: 10,
    },
    legendHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    showAll: {
      fontSize: 11,
      fontWeight: "600",
    },
    legendList: {
      gap: 6,
    },
    legendRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    legendLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    legendLabel: {
      fontSize: 12,
      fontWeight: "600",
    },
    legendCount: {
      fontSize: 11,
      fontWeight: "700",
    },
    filterHint: {
      fontSize: 12,
    },
    errorRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    recentList: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 10,
    },
    recentItem: {
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    recentCopy: {
      flex: 1,
      minWidth: 0,
    },
    recentName: {
      fontSize: 14,
      fontWeight: "600",
    },
    recentMeta: {
      marginTop: 2,
      fontSize: 11,
    },
    recentStage: {
      marginTop: 2,
      fontSize: 10,
    },
    recentValue: {
      fontSize: 12,
      fontWeight: "800",
    },
    emptyText: {
      fontSize: 14,
    },
  });
}
