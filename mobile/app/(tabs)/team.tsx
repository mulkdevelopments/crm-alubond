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
import { listActivities, listProjects, type ApiProject } from "@/lib/api/projects-api";
import {
  peopleFromRegionalCards,
  rankMonthlyPerformers,
  type MonthlyPerformerRow,
} from "@/lib/monthly-performers";
import {
  buildHierarchy,
  buildRegionHierarchy,
  nameInitials,
  type FlatActivity,
  type ManagerCard,
  type RegionalCard,
  type SalesRepCard,
} from "@/lib/team-performance";
import { formatAed } from "@/lib/utils";

type GroupMode = "manager" | "region";

function wonProjectsOf(projects: ApiProject[]) {
  return projects.filter((project) => project.stage === "Won");
}

function wonAed(projects: ApiProject[]) {
  return wonProjectsOf(projects).reduce((sum, project) => sum + project.valueAed, 0);
}

function byPerformanceDesc<T extends { name: string; metrics: { achievedAed: number; attainmentPct: number } }>(
  a: T,
  b: T,
) {
  if (b.metrics.achievedAed !== a.metrics.achievedAed) {
    return b.metrics.achievedAed - a.metrics.achievedAed;
  }
  if (b.metrics.attainmentPct !== a.metrics.attainmentPct) {
    return b.metrics.attainmentPct - a.metrics.attainmentPct;
  }
  return a.name.localeCompare(b.name);
}

function peopleCount(card: RegionalCard) {
  return (
    card.managers.length +
    card.directReps.length +
    card.managers.reduce((sum, manager) => sum + manager.reps.length, 0)
  );
}

/** Self bucket for a regional/region card: RM-credited + orphan deals (no manager/rep). */
function selfProjects(card: RegionalCard) {
  return card.unassignedProjects;
}

/** Won on named people under this node — managers (incl. their self) + direct reps. */
function peopleWonAed(card: RegionalCard) {
  const underManagers = card.managers.reduce((sum, manager) => sum + manager.metrics.achievedAed, 0);
  const direct = card.directReps.reduce((sum, rep) => sum + rep.metrics.achievedAed, 0);
  return underManagers + direct;
}

function managerSelfProjects(manager: ManagerCard) {
  return manager.unassignedProjects;
}

function managerPeopleWonAed(manager: ManagerCard) {
  return manager.reps.reduce((sum, rep) => sum + rep.metrics.achievedAed, 0);
}

export default function TeamScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [activities, setActivities] = useState<FlatActivity[]>([]);
  const [groupMode, setGroupMode] = useState<GroupMode>("manager");
  const [selectedRegionalId, setSelectedRegionalId] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [visitPopup, setVisitPopup] = useState<{ ownerName: string; visits: FlatActivity[] } | null>(null);
  const [pipelinePopup, setPipelinePopup] = useState<{
    ownerName: string;
    projects: ApiProject[];
    kind: "pipeline" | "won";
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError(null);
    const [usersData, projectsData, activityItems] = await Promise.all([
      listUsers(token),
      listProjects(token),
      listActivities(token, { type: "visit" }),
    ]);
    setProjects(projectsData);
    setActivities(
      activityItems.map(
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
      ),
    );
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

  const hierarchy = useMemo(() => {
    const cards =
      groupMode === "region"
        ? buildRegionHierarchy(usersSnapshot, projects, activities)
        : buildHierarchy(usersSnapshot, projects, activities);
    return [...cards].sort(byPerformanceDesc);
  }, [usersSnapshot, projects, activities, groupMode]);

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

  const bestPerformerId = hierarchy[0]?.id ?? null;

  const monthlyBoard = useMemo(() => {
    const cards = selectedRegional ? [selectedRegional] : hierarchy;
    const requireDailyVisitById = Object.fromEntries(
      usersSnapshot.map((entry) => [entry.id, Boolean(entry.requireDailyVisit)]),
    );
    const people = peopleFromRegionalCards(cards, {
      includeRegionalRoots: groupMode === "manager",
      requireDailyVisitById,
    });
    return rankMonthlyPerformers({
      people,
      projects,
      visits: activities,
      monthOffset,
    });
  }, [hierarchy, selectedRegional, groupMode, projects, activities, monthOffset, usersSnapshot]);

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

  if (loading) return <ScreenLoader label="Loading team performance..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="Field Team"
          title={groupMode === "region" ? "Performance by region" : "Performance by regional manager"}
        />

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
            style={styles.crumbBtn}
            onPress={() => {
              setSelectedRegionalId(null);
              setMonthOffset(0);
            }}
          >
            {selectedRegional ? <ChevronLeft size={14} color={colors.text2} strokeWidth={2.2} /> : null}
            <Text style={[styles.crumbText, { color: selectedRegional ? colors.text2 : colors.text1 }]}>
              {groupMode === "region" ? "All regions" : "All regional managers"}
            </Text>
          </Pressable>
          {selectedRegional ? (
            <>
              <ChevronRight size={14} color={colors.text3} strokeWidth={2.2} />
              <Text style={[styles.crumbCurrent, { color: colors.text1 }]} numberOfLines={1}>
                {selectedRegional.name}
              </Text>
            </>
          ) : null}
        </View>

        <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
          <Pressable
            style={[styles.toggleBtn, groupMode === "manager" && { backgroundColor: colors.surface }]}
            onPress={() => {
              setGroupMode("manager");
              setSelectedRegionalId(null);
              setMonthOffset(0);
            }}
          >
            <Text style={[styles.toggleText, { color: groupMode === "manager" ? colors.text1 : colors.text3 }]}>
              By manager
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, groupMode === "region" && { backgroundColor: colors.surface }]}
            onPress={() => {
              setGroupMode("region");
              setSelectedRegionalId(null);
              setMonthOffset(0);
            }}
          >
            <Text style={[styles.toggleText, { color: groupMode === "region" ? colors.text1 : colors.text3 }]}>
              By region
            </Text>
          </Pressable>
        </View>

        {hierarchy.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>
              No hierarchy data available for your role scope.
            </Text>
          </Card>
        ) : null}

        {!selectedRegional ? (
          <View style={styles.cardGrid}>
            {hierarchy.map((card) => {
              const fromPeople = peopleWonAed(card);
              const selfWon = wonAed(selfProjects(card));
              return (
                <PerformanceCard
                  key={card.id}
                  name={card.name}
                  location={`${peopleCount(card)} people · ${card.location}`}
                  metrics={card.metrics}
                  topPerformer={card.id === bestPerformerId}
                  isYou={user?.id === card.id}
                  online={card.online}
                  presenceLabel={card.presenceLabel}
                  breakdown={{ fromPeople, self: selfWon }}
                  onPress={() => {
                    setSelectedRegionalId(card.id);
                    setMonthOffset(0);
                  }}
                  onWonPress={() =>
                    setPipelinePopup({
                      ownerName: card.name,
                      projects: wonProjectsOf(card.scopedProjects),
                      kind: "won",
                    })
                  }
                  onPipelinePress={() =>
                    setPipelinePopup({
                      ownerName: card.name,
                      projects: card.pipelineProjects,
                      kind: "pipeline",
                    })
                  }
                  onVisitsPress={() => setVisitPopup({ ownerName: card.name, visits: card.visits })}
                />
              );
            })}
          </View>
        ) : (
          <DrillDown
            card={selectedRegional}
            colors={colors}
            styles={styles}
            currentUserId={user?.id}
            onWon={(ownerName, list) => setPipelinePopup({ ownerName, projects: list, kind: "won" })}
            onPipeline={(ownerName, list) =>
              setPipelinePopup({ ownerName, projects: list, kind: "pipeline" })
            }
            onVisits={(ownerName, visits) => setVisitPopup({ ownerName, visits })}
          />
        )}

        {hierarchy.length > 0 ? (
          <MonthlyPerformersBoard
            colors={colors}
            styles={styles}
            monthLabel={monthlyBoard.monthLabel}
            canGoNext={monthlyBoard.canGoNext}
            canGoPrev={monthlyBoard.canGoPrev}
            top={monthlyBoard.top}
            under={monthlyBoard.under}
            onPrev={() => setMonthOffset((value) => value - 1)}
            onNext={() => setMonthOffset((value) => Math.min(0, value + 1))}
          />
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
        kind={pipelinePopup?.kind}
        viewerRole={user?.role}
        onClose={() => setPipelinePopup(null)}
      />
    </View>
  );
}

function MonthlyPerformersBoard({
  colors,
  styles,
  monthLabel,
  canGoNext,
  canGoPrev,
  top,
  under,
  onPrev,
  onNext,
}: {
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  monthLabel: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  top: MonthlyPerformerRow[];
  under: MonthlyPerformerRow[];
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <Card style={styles.monthlyCard}>
      <View style={styles.monthlyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.monthlyTitle, { color: colors.text1 }]}>Monthly performers</Text>
          <Text style={{ color: colors.text3, fontSize: 12, marginTop: 2 }}>
            Won AED + weekday visit KPI for visit-required users
          </Text>
        </View>
        <View style={styles.monthNav}>
          <Pressable
            onPress={onPrev}
            disabled={!canGoPrev}
            style={[styles.monthNavBtn, { borderColor: colors.border, opacity: canGoPrev ? 1 : 0.4 }]}
          >
            <ChevronLeft size={16} color={colors.text2} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text1 }]}>{monthLabel}</Text>
          <Pressable
            onPress={onNext}
            disabled={!canGoNext}
            style={[styles.monthNavBtn, { borderColor: colors.border, opacity: canGoNext ? 1 : 0.4 }]}
          >
            <ChevronRight size={16} color={colors.text2} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <PerformerList
        colors={colors}
        styles={styles}
        title="Top performers"
        tone="top"
        rows={top}
        empty="No wins recorded this month."
      />
      <PerformerList
        colors={colors}
        styles={styles}
        title="Underperformers"
        tone="under"
        rows={under}
        empty="No underperformers for this month."
      />
    </Card>
  );
}

function PerformerList({
  colors,
  styles,
  title,
  tone,
  rows,
  empty,
}: {
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  title: string;
  tone: "top" | "under";
  rows: MonthlyPerformerRow[];
  empty: string;
}) {
  const headerStyle =
    tone === "top"
      ? { borderColor: "rgba(16,185,129,0.35)", backgroundColor: "rgba(16,185,129,0.12)" }
      : { borderColor: "rgba(244,63,94,0.35)", backgroundColor: "rgba(244,63,94,0.12)" };
  const headerText = tone === "top" ? "#059669" : "#e11d48";

  return (
    <View style={[styles.performerBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
      <View style={[styles.performerHeader, headerStyle]}>
        <Text style={{ color: headerText, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
          {title}
          {rows.length > 0 ? ` (${rows.length})` : ""}
        </Text>
      </View>
      {rows.length === 0 ? (
        <Text style={{ color: colors.text3, fontSize: 13, padding: 12 }}>{empty}</Text>
      ) : (
        rows.map((row, index) => {
          const visitFail = row.requireDailyVisit && !row.visitOnTrack;
          const visitOk = row.requireDailyVisit && row.visitOnTrack;
          return (
            <View
              key={row.id}
              style={[
                styles.performerRow,
                { borderTopColor: colors.border },
                index === 0 && { borderTopWidth: 0 },
              ]}
            >
              <Text style={{ color: colors.text3, width: 18, fontSize: 12 }}>{index + 1}</Text>
              <View
                style={[styles.performerAvatar, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text2, fontSize: 11, fontWeight: "700" }}>
                  {nameInitials(row.name)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text1, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={{ color: colors.text3, fontSize: 11 }} numberOfLines={1}>
                  {row.role}
                </Text>
                {tone === "under" && row.reasons.length > 0 ? (
                  <Text style={{ color: "#e11d48", fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {row.reasons.join(" · ")}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.text1, fontSize: 13, fontWeight: "700" }}>
                  {formatAed(row.wonAed, true)}
                </Text>
                <View
                  style={[
                    styles.visitBadge,
                    visitFail ? styles.visitBadgeFail : null,
                    visitOk ? styles.visitBadgeOk : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.visitBadgeText,
                      visitFail ? styles.visitBadgeTextFail : null,
                      visitOk ? styles.visitBadgeTextOk : null,
                    ]}
                  >
                    {row.requireDailyVisit
                      ? `Visits ${row.visitDays}/${row.expectedVisitDays}d`
                      : `Visits ${row.visits}`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function DrillDown({
  card,
  colors,
  styles,
  currentUserId,
  onWon,
  onPipeline,
  onVisits,
}: {
  card: RegionalCard;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  currentUserId?: string;
  onWon: (ownerName: string, projects: ApiProject[]) => void;
  onPipeline: (ownerName: string, projects: ApiProject[]) => void;
  onVisits: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  const fromPeople = peopleWonAed(card);
  const selfWonProjects = wonProjectsOf(selfProjects(card));
  const selfWon = wonAed(selfWonProjects);

  return (
    <View style={styles.focusStack}>
      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: colors.text1 }]}>{card.name}</Text>
        <Text style={[styles.summaryMeta, { color: colors.text3 }]}>{card.location}</Text>
        {card.presenceLabel ? (
          <Text style={{ color: card.online ? "#059669" : colors.text3, fontSize: 12, marginTop: 4 }}>
            {card.presenceLabel}
          </Text>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryChip
            colors={colors}
            label="Total won"
            value={formatAed(card.metrics.achievedAed, true)}
            onPress={() => onWon(card.name, wonProjectsOf(card.scopedProjects))}
          />
          <SummaryChip
            colors={colors}
            label="Self"
            value={formatAed(selfWon, true)}
            onPress={
              selfWonProjects.length > 0
                ? () => onWon(`${card.name} · Self`, selfWonProjects)
                : undefined
            }
          />
          <SummaryChip colors={colors} label="From people" value={formatAed(fromPeople, true)} />
          <SummaryChip
            colors={colors}
            label="Pipeline"
            value={formatAed(card.metrics.pipelineAed, true)}
            onPress={() => onPipeline(card.name, card.pipelineProjects)}
          />
          <SummaryChip
            colors={colors}
            label="Visits/wk"
            value={String(card.metrics.visitsWeek)}
            accent
            onPress={() => onVisits(card.name, card.visits)}
          />
        </View>
      </Card>

      {card.managers.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading title="Managers" count={card.managers.length} colors={colors} styles={styles} />
          {[...card.managers].sort(byPerformanceDesc).map((manager) => (
            <ManagerBlock
              key={manager.id}
              manager={manager}
              colors={colors}
              styles={styles}
              currentUserId={currentUserId}
              onWon={onWon}
              onPipeline={onPipeline}
              onVisits={onVisits}
            />
          ))}
        </View>
      ) : null}

      {card.directReps.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading title="Direct sales reps" count={card.directReps.length} colors={colors} styles={styles} />
          {[...card.directReps].sort(byPerformanceDesc).map((rep) => (
            <PersonRow
              key={rep.id}
              person={rep}
              role="Sales rep"
              currentUserId={currentUserId}
              onWon={onWon}
              onPipeline={onPipeline}
              onVisits={onVisits}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ManagerBlock({
  manager,
  colors,
  styles,
  currentUserId,
  onWon,
  onPipeline,
  onVisits,
}: {
  manager: ManagerCard;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  currentUserId?: string;
  onWon: (ownerName: string, projects: ApiProject[]) => void;
  onPipeline: (ownerName: string, projects: ApiProject[]) => void;
  onVisits: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  const selfWonProjects = wonProjectsOf(managerSelfProjects(manager));
  const selfWon = wonAed(selfWonProjects);
  const fromPeople = managerPeopleWonAed(manager);

  return (
    <View style={[styles.managerBlock, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <PersonRow
        person={manager}
        role="Manager"
        currentUserId={currentUserId}
        breakdown={{ self: selfWon, fromPeople }}
        onWon={onWon}
        onSelf={
          selfWonProjects.length > 0
            ? () => onWon(`${manager.name} · Self`, selfWonProjects)
            : undefined
        }
        onPipeline={onPipeline}
        onVisits={onVisits}
      />
      {manager.reps.length > 0 ? (
        <View style={styles.repStack}>
          {[...manager.reps].sort(byPerformanceDesc).map((rep: SalesRepCard) => (
            <PersonRow
              key={rep.id}
              person={rep}
              role="Sales rep"
              currentUserId={currentUserId}
              onWon={onWon}
              onPipeline={onPipeline}
              onVisits={onVisits}
            />
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.text3, fontSize: 12 }}>No sales reps under this manager.</Text>
      )}
    </View>
  );
}

function PersonRow({
  person,
  role,
  currentUserId,
  note,
  breakdown,
  onWon,
  onSelf,
  onPipeline,
  onVisits,
}: {
  person: SalesRepCard | ManagerCard;
  role: string;
  currentUserId?: string;
  note?: string;
  breakdown?: { fromPeople: number; self: number };
  onWon: (ownerName: string, projects: ApiProject[]) => void;
  onSelf?: () => void;
  onPipeline: (ownerName: string, projects: ApiProject[]) => void;
  onVisits: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  return (
    <PerformanceCard
      name={person.name}
      location={person.location}
      role={role}
      metrics={person.metrics}
      topPerformer={false}
      isYou={currentUserId === person.id}
      online={person.online}
      presenceLabel={person.presenceLabel}
      note={note}
      breakdown={breakdown}
      onWonPress={() => onWon(person.name, wonProjectsOf(person.scopedProjects))}
      onSelfPress={onSelf}
      onPipelinePress={() => onPipeline(person.name, person.pipelineProjects)}
      onVisitsPress={() => onVisits(person.name, person.visits)}
    />
  );
}

function SectionHeading({
  title,
  count,
  colors,
  styles,
}: {
  title: string;
  count: number;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.text1 }]}>{title}</Text>
      <Text style={[styles.sectionCount, { color: colors.text3, borderColor: colors.border }]}>{count}</Text>
    </View>
  );
}

function SummaryChip({
  colors,
  label,
  value,
  warn,
  accent,
  onPress,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  warn?: boolean;
  accent?: boolean;
  onPress?: () => void;
}) {
  const labelColor = warn ? "#b45309" : accent ? "#0ea5e9" : colors.text3;
  const valueColor = warn ? "#92400e" : accent ? "#0284c7" : colors.text1;
  const body = (
    <>
      <Text style={{ color: labelColor, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ color: valueColor, fontSize: 13, fontWeight: "700", marginTop: 4 }}>{value}</Text>
    </>
  );
  const style = {
    flexGrow: 1,
    flexBasis: "45%" as const,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: warn
      ? "rgba(245,158,11,0.4)"
      : accent
        ? "rgba(14,165,233,0.45)"
        : colors.border,
    backgroundColor: warn
      ? "rgba(245,158,11,0.12)"
      : accent
        ? "rgba(14,165,233,0.12)"
        : colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  };
  if (onPress) {
    return (
      <Pressable style={style} onPress={onPress}>
        {body}
      </Pressable>
    );
  }
  return <View style={style}>{body}</View>;
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
      gap: 6,
    },
    crumbBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    crumbText: {
      fontSize: 12,
      fontWeight: "600",
    },
    crumbCurrent: {
      fontSize: 12,
      fontWeight: "700",
      maxWidth: 180,
    },
    toggleRow: {
      flexDirection: "row",
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 10,
      padding: 2,
      gap: 2,
    },
    toggleBtn: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleText: {
      fontSize: 12,
      fontWeight: "600",
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
    summaryCard: {
      padding: 16,
      gap: 4,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    summaryMeta: {
      fontSize: 12,
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    summaryHint: {
      marginTop: 10,
      fontSize: 12,
    },
    section: {
      gap: 10,
    },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    sectionCount: {
      fontSize: 11,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: "hidden",
    },
    managerBlock: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      gap: 10,
    },
    repStack: {
      gap: 10,
      paddingLeft: 4,
    },
    monthlyCard: {
      padding: 14,
      gap: 12,
    },
    monthlyHeader: {
      gap: 10,
    },
    monthlyTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    monthNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    monthLabel: {
      minWidth: 140,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "600",
    },
    performerBox: {
      borderWidth: 1,
      borderRadius: 14,
      overflow: "hidden",
    },
    performerHeader: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    performerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    performerAvatar: {
      width: 28,
      height: 28,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    visitBadge: {
      marginTop: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(14,165,233,0.45)",
      backgroundColor: "rgba(14,165,233,0.12)",
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    visitBadgeFail: {
      borderColor: "rgba(244,63,94,0.45)",
      backgroundColor: "rgba(244,63,94,0.12)",
    },
    visitBadgeOk: {
      borderColor: "rgba(16,185,129,0.45)",
      backgroundColor: "rgba(16,185,129,0.12)",
    },
    visitBadgeText: {
      color: "#0284c7",
      fontSize: 10,
      fontWeight: "700",
    },
    visitBadgeTextFail: {
      color: "#e11d48",
    },
    visitBadgeTextOk: {
      color: "#059669",
    },
  });
}
