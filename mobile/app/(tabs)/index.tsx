import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, Briefcase, MapPin, Phone, Target, Trophy } from "lucide-react-native";

import { FunnelChart } from "@/components/charts/FunnelChart";
import { LossDonut } from "@/components/charts/LossDonut";
import { TrendChart } from "@/components/charts/TrendChart";
import { ScreenLoader } from "@/components/ScreenLoader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  DashboardKpiDetailModal,
  type KpiDetailKind,
} from "@/components/dashboard/DashboardKpiDetailModal";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listUsers } from "@/lib/api/auth-api";
import { listFollowUps, type ApiFollowUp } from "@/lib/api/followups-api";
import {
  listActivities,
  listProjectActivities,
  listProjects,
  type ApiProject,
  type ProjectActivity,
} from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  buildLossBreakdown,
  buildMonthlyTrend,
  buildStageFunnel,
  isLive,
  relativeTimeFromIso,
} from "@/lib/dashboard";
import { monthOffsetToRange } from "@/lib/monthly-performers";
import { formatAed, formatProjectValue } from "@/lib/utils";
import { canAccessFieldTeam } from "@/lib/team-performance";

type ActivityFeedItem = {
  id: string;
  who: string;
  what: string;
  project: string;
  whenIso: string;
};

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [followUps, setFollowUps] = useState<ApiFollowUp[]>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listUsers>>>([]);
  const [visits, setVisits] = useState<ProjectActivity[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [kpiDetail, setKpiDetail] = useState<KpiDetailKind | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const [projectItems, followUpItems, visitItems] = await Promise.all([
      listProjects(token),
      listFollowUps(token),
      listActivities(token, { type: "visit" }).catch(() => [] as ProjectActivity[]),
    ]);
    setProjects(projectItems);
    setFollowUps(followUpItems);
    setVisits(visitItems);

    try {
      setUsers(await listUsers(token));
    } catch {
      setUsers([]);
    }

    const topProjects = projectItems.slice(0, 8);
    const activityBuckets = await Promise.all(
      topProjects.map(async (project) => {
        try {
          const items = await listProjectActivities(token, project.id);
          return items.map((item) => ({ item, projectName: project.name }));
        } catch {
          return [] as Array<{ item: ProjectActivity; projectName: string }>;
        }
      })
    );

    setActivityFeed(
      activityBuckets
        .flat()
        .sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime())
        .slice(0, 12)
        .map((entry) => ({
          id: entry.item.id,
          who: entry.item.createdByName ?? "System",
          what: (entry.item.message.split("\n")[0] ?? entry.item.message).slice(0, 90),
          project: entry.projectName,
          whenIso: entry.item.createdAt,
        }))
    );
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.stage !== "Won" && project.stage !== "Lost"),
    [projects]
  );
  const wonProjects = useMemo(() => projects.filter((project) => project.stage === "Won"), [projects]);
  const visitsThisMonth = useMemo(() => {
    const range = monthOffsetToRange(0);
    const inMonth = visits.filter((visit) => {
      const date = new Date(visit.createdAt);
      if (Number.isNaN(date.getTime())) return false;
      return date >= range.start && date < range.end;
    });
    const people = new Set(
      inMonth.map((visit) => visit.createdById).filter((id): id is string => Boolean(id)),
    );
    const days = new Set(
      inMonth.map((visit) => {
        const date = new Date(visit.createdAt);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }),
    );
    return {
      count: inMonth.length,
      people: people.size,
      days: days.size,
      label: range.label,
    };
  }, [visits]);
  const hotProjects = useMemo(
    () =>
      [...activeProjects]
        .sort((a, b) => b.probability * b.valueAed - a.probability * a.valueAed)
        .slice(0, 4),
    [activeProjects]
  );

  const pipelineValue = activeProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const wonValue = wonProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const forecast = activeProjects.reduce(
    (sum, project) => sum + (project.valueAed * project.probability) / 100,
    0
  );

  const monthlyTrend = useMemo(
    () =>
      buildMonthlyTrend({
        projects,
        users,
        currentUserId: user?.id,
        currentUserRole: user?.role,
      }),
    [projects, users, user?.id, user?.role]
  );
  const lossBreakdown = useMemo(() => buildLossBreakdown(projects), [projects]);
  const stageFunnel = useMemo(() => buildStageFunnel(projects), [projects]);
  const teamSummary = useMemo(() => {
    const regionalCount = users.filter((entry) => entry.role === "REGIONAL_MANAGER").length;
    const managerCount = users.filter((entry) => entry.role === "MANAGER").length;
    const repCount = users.filter((entry) => entry.role === "SALES_REP").length;
    const liveReps = users.filter(
      (entry) => entry.role === "SALES_REP" && isLive(entry.lastLocationPingAt, entry.isActive)
    ).length;
    const teamPipeline = projects
      .filter((project) => project.stage !== "Won" && project.stage !== "Lost")
      .reduce((sum, project) => sum + project.valueAed, 0);
    return { regionalCount, managerCount, repCount, liveReps, teamPipeline };
  }, [projects, users]);
  const canViewTeam = canAccessFieldTeam(user?.role);

  if (loading) return <ScreenLoader label="Loading dashboard..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void (async () => {
                setRefreshing(true);
                try {
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to refresh dashboard.");
                } finally {
                  setRefreshing(false);
                }
              })()
            }
          />
        }
      >
        <PageHeader
          title={
            <Text style={styles.greeting}>
              Good morning, {user?.firstName ?? "there"}
              <Text style={{ color: colors.brand }}>.</Text>
            </Text>
          }
        />

        {error ? (
          <Card style={styles.errorCard}>
            <View style={styles.errorRow}>
              <AlertTriangle size={16} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.kpiGrid}>
          <KpiCard
            label="Pipeline value"
            value={formatAed(pipelineValue, true)}
            hint={`${activeProjects.length} active`}
            accent="brand"
            icon={<Briefcase size={16} color={colors.text2} strokeWidth={2.2} />}
            onPress={() => setKpiDetail("pipeline")}
          />
          <KpiCard
            label="Forecast (weighted)"
            value={formatAed(forecast, true)}
            hint="Weighted by probability"
            accent="success"
            icon={<Target size={16} color={colors.text2} strokeWidth={2.2} />}
            onPress={() => setKpiDetail("forecast")}
          />
          <KpiCard
            label="MTD won"
            value={formatAed(wonValue, true)}
            hint={`${wonProjects.length} won projects`}
            accent="warning"
            spark={monthlyTrend.map((entry) => entry.achieved)}
            icon={<Trophy size={16} color={colors.text2} strokeWidth={2.2} />}
            onPress={() => setKpiDetail("won")}
          />
          <KpiCard
            label="Visits this month"
            value={String(visitsThisMonth.count)}
            hint={`${visitsThisMonth.people} people · ${visitsThisMonth.days} days · ${visitsThisMonth.label}`}
            accent="brand"
            icon={<MapPin size={16} color={colors.text2} strokeWidth={2.2} />}
            onPress={() => {
              if (canViewTeam) router.push("/(tabs)/team");
            }}
          />
        </View>

        <Card style={styles.sectionCard}>
          <CardHeader title="Sales target vs achieved" subtitle="Monthly target (yearly ÷ 12) · last 6 months · AED M" />
          <View style={styles.chartBody}>
            <TrendChart data={monthlyTrend} />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader title="Loss analysis" subtitle="Lost deal competitor split" />
          <View style={styles.chartBodyPadded}>
            <LossDonut data={lossBreakdown} />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader
            title="Pipeline funnel"
            subtitle="Stage distribution"
            actionLabel="Open kanban"
            onActionPress={() => router.push("/(tabs)/pipeline")}
          />
          <View style={styles.chartBodyPadded}>
            <FunnelChart data={stageFunnel} />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader
            title="Hot projects this week"
            subtitle="Highest probability × value"
            action={<Badge tone="brand">{`${hotProjects.length} to push`}</Badge>}
          />
          <View style={styles.hotGrid}>
            {hotProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => router.push(`/project/${project.id}`)}
                style={[styles.hotCard, { borderColor: colors.border }]}
              >
                <Text style={[styles.hotTitle, { color: colors.text }]} numberOfLines={1}>
                  {project.name}
                </Text>
                <Text style={[styles.hotMeta, { color: colors.text3 }]}>
                  {project.city}, {project.country} · {project.stage}
                </Text>
                <Text style={[styles.hotMeta, { color: colors.text3 }]}>
                  {formatProjectValue(project, user?.role, true)} · {project.probability}% win
                </Text>
              </Pressable>
            ))}
            {hotProjects.length === 0 ? (
              <Text style={[styles.emptyInline, { color: colors.text3 }]}>No active projects available.</Text>
            ) : null}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader title="Recent activity feed" subtitle="Latest project timeline updates" />
          <View style={styles.sectionBody}>
            {activityFeed.map((activity) => (
              <View key={activity.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                <Avatar name={activity.who} size="sm" />
                <View style={styles.activityBody}>
                  <Text style={[styles.activityText, { color: colors.text }]}>
                    <Text style={styles.activityWho}>{activity.who}</Text>{" "}
                    <Text style={{ color: colors.text2 }}>{activity.what}</Text>
                  </Text>
                  <Text style={[styles.activityProject, { color: colors.text3 }]} numberOfLines={1}>
                    {activity.project}
                  </Text>
                </View>
                <Text style={[styles.activityWhen, { color: colors.text3 }]}>
                  {relativeTimeFromIso(activity.whenIso)}
                </Text>
              </View>
            ))}
            {activityFeed.length === 0 ? (
              <Text style={[styles.emptyInline, { color: colors.text3 }]}>No activity recorded yet.</Text>
            ) : null}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader
            title="Upcoming follow-ups"
            subtitle="Live reminders"
            actionLabel="See all"
            onActionPress={() => router.push("/(tabs)/follow-ups")}
          />
          <View style={styles.sectionBody}>
            {followUps.slice(0, 5).map((followUp) => {
              const tone =
                followUp.status === "Overdue"
                  ? "danger"
                  : followUp.status === "Due today"
                    ? "warning"
                    : "success";
              return (
                <View
                  key={followUp.id}
                  style={[styles.followUpRow, { backgroundColor: colors.surface2 }]}
                >
                  <View
                    style={[
                      styles.followUpDot,
                      {
                        backgroundColor:
                          tone === "danger" ? "#f43f5e" : tone === "warning" ? "#f59e0b" : "#10b981",
                      },
                    ]}
                  />
                  <View style={styles.followUpBody}>
                    <View style={styles.followUpTop}>
                      <Badge tone={tone}>{followUp.status}</Badge>
                      <Text style={[styles.followUpChannel, { color: colors.text3 }]}>
                        {followUp.channel}
                      </Text>
                    </View>
                    <Text style={[styles.followUpContact, { color: colors.text }]} numberOfLines={1}>
                      {followUp.contact}
                    </Text>
                    <Text style={[styles.followUpProject, { color: colors.text3 }]} numberOfLines={1}>
                      {followUp.projectName}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.phoneButton, { backgroundColor: colors.surface }]}
                    onPress={() => router.push("/(tabs)/follow-ups")}
                  >
                    <Phone size={12} color={colors.text2} strokeWidth={2.2} />
                  </Pressable>
                </View>
              );
            })}
            {followUps.length === 0 ? (
              <Text style={[styles.emptyInline, { color: colors.text3 }]}>No follow-ups found.</Text>
            ) : null}
          </View>
        </Card>

        {canViewTeam ? (
        <Card style={styles.sectionCard}>
          <CardHeader
            title="Team performance"
            subtitle="Open the dedicated full-page view for regional, manager, and sales-rep insights."
            actionLabel="Open full page"
            onActionPress={() => router.push("/(tabs)/team")}
          />
          <View style={styles.teamGrid}>
            <TeamStat label="Regional managers" value={String(teamSummary.regionalCount)} colors={colors} />
            <TeamStat label="Managers" value={String(teamSummary.managerCount)} colors={colors} />
            <TeamStat label="Sales reps" value={String(teamSummary.repCount)} colors={colors} />
            <TeamStat label="Live reps" value={String(teamSummary.liveReps)} colors={colors} />
            <TeamStat
              label="Team pipeline"
              value={formatAed(teamSummary.teamPipeline, true)}
              colors={colors}
              wide
            />
          </View>
        </Card>
        ) : null}
      </ScrollView>

      <DashboardKpiDetailModal
        kind={kpiDetail}
        activeProjects={activeProjects}
        wonProjects={wonProjects}
        viewerRole={user?.role}
        onClose={() => setKpiDetail(null)}
        onOpenProject={(projectId) => router.push(`/project/${projectId}`)}
        onViewMore={() => router.push("/(tabs)/pipeline")}
      />
    </View>
  );
}

function TeamStat({
  label,
  value,
  colors,
  wide = false,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  wide?: boolean;
}) {
  return (
    <View style={[teamStatStyles.item, { backgroundColor: colors.surface2, width: wide ? "100%" : "48%" }]}>
      <Text style={[teamStatStyles.label, { color: colors.text3 }]}>{label}</Text>
      <Text style={[teamStatStyles.value, { color: colors.text, fontSize: wide ? 16 : 20 }]}>{value}</Text>
    </View>
  );
}

const teamStatStyles = StyleSheet.create({
  item: {
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  value: {
    marginTop: 4,
    fontWeight: "800",
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 120,
    },
    greeting: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: colors.text,
    },
    errorCard: {
      padding: 14,
      marginBottom: 16,
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
    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
      marginBottom: 16,
    },
    sectionCard: {
      marginBottom: 16,
    },
    chartBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    chartBodyPadded: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 4,
    },
    sectionBody: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    hotGrid: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    hotCard: {
      width: "48%",
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    hotTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    hotMeta: {
      marginTop: 4,
      fontSize: 11,
    },
    activityRow: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    activityBody: {
      flex: 1,
      minWidth: 0,
    },
    activityText: {
      fontSize: 14,
    },
    activityWho: {
      fontWeight: "700",
    },
    activityProject: {
      marginTop: 2,
      fontSize: 11,
    },
    activityWhen: {
      fontSize: 10,
      marginTop: 2,
    },
    followUpRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    followUpDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginTop: 6,
    },
    followUpBody: {
      flex: 1,
      minWidth: 0,
    },
    followUpTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    followUpChannel: {
      fontSize: 10,
    },
    followUpContact: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: "600",
    },
    followUpProject: {
      marginTop: 2,
      fontSize: 11,
    },
    phoneButton: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    teamGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    emptyInline: {
      fontSize: 12,
    },
  });
}
