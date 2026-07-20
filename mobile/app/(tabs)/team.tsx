import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ChevronLeft, ChevronRight, UserRoundX } from "lucide-react-native";

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
  buildHierarchy,
  buildRegionHierarchy,
  type FlatActivity,
  type ManagerCard,
  type RegionalCard,
  type SalesRepCard,
} from "@/lib/team-performance";
import { formatAed, formatProjectValue } from "@/lib/utils";

type GroupMode = "manager" | "region";

function wonProjectsOf(projects: ApiProject[]) {
  return projects.filter((project) => project.stage === "Won");
}

function wonAed(projects: ApiProject[]) {
  return wonProjectsOf(projects).reduce((sum, project) => sum + project.valueAed, 0);
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

  const hierarchy = useMemo(
    () =>
      groupMode === "region"
        ? buildRegionHierarchy(usersSnapshot, projects, activities)
        : buildHierarchy(usersSnapshot, projects, activities),
    [usersSnapshot, projects, activities, groupMode],
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

  const bestPerformerId = useMemo(() => {
    const sorted = [...hierarchy].sort((a, b) => b.metrics.attainmentPct - a.metrics.attainmentPct);
    return sorted[0]?.id ?? null;
  }, [hierarchy]);

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
            onPress={() => setSelectedRegionalId(null)}
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
                  onPress={() => setSelectedRegionalId(card.id)}
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
            viewerRole={user?.role}
            onWon={(ownerName, list) => setPipelinePopup({ ownerName, projects: list, kind: "won" })}
            onPipeline={(ownerName, list) =>
              setPipelinePopup({ ownerName, projects: list, kind: "pipeline" })
            }
            onVisits={(ownerName, visits) => setVisitPopup({ ownerName, visits })}
          />
        )}
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

function DrillDown({
  card,
  colors,
  styles,
  currentUserId,
  viewerRole,
  onWon,
  onPipeline,
  onVisits,
}: {
  card: RegionalCard;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  currentUserId?: string;
  viewerRole?: string;
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
        </View>
      </Card>

      {selfWonProjects.length > 0 ? (
        <SelfOwnedBlock
          ownerName={card.name}
          projects={selfWonProjects}
          colors={colors}
          styles={styles}
          viewerRole={viewerRole}
          onOpenWon={() => onWon(`${card.name} · Self`, selfWonProjects)}
        />
      ) : null}

      {card.managers.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading title="Managers" count={card.managers.length} colors={colors} styles={styles} />
          {card.managers.map((manager) => (
            <ManagerBlock
              key={manager.id}
              manager={manager}
              colors={colors}
              styles={styles}
              currentUserId={currentUserId}
              viewerRole={viewerRole}
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
          {card.directReps.map((rep) => (
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
  viewerRole,
  onWon,
  onPipeline,
  onVisits,
}: {
  manager: ManagerCard;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  currentUserId?: string;
  viewerRole?: string;
  onWon: (ownerName: string, projects: ApiProject[]) => void;
  onPipeline: (ownerName: string, projects: ApiProject[]) => void;
  onVisits: (ownerName: string, visits: FlatActivity[]) => void;
}) {
  const selfWonProjects = wonProjectsOf(managerSelfProjects(manager));
  const selfWon = wonAed(selfWonProjects);
  const fromPeople = managerPeopleWonAed(manager);

  return (
    <View style={[styles.managerBlock, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.managerName, { color: colors.text1 }]}>
        {manager.name}
        {currentUserId === manager.id ? " · You" : ""}
      </Text>
      <Text style={[styles.managerMeta, { color: colors.text3 }]}>{manager.location || "Manager"}</Text>
      {manager.presenceLabel ? (
        <Text style={{ color: manager.online ? "#059669" : colors.text3, fontSize: 12, marginTop: 2 }}>
          {manager.presenceLabel}
        </Text>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryChip
          colors={colors}
          label="Total won"
          value={formatAed(manager.metrics.achievedAed, true)}
          onPress={() => onWon(manager.name, wonProjectsOf(manager.scopedProjects))}
        />
        <SummaryChip
          colors={colors}
          label="Self"
          value={formatAed(selfWon, true)}
          onPress={
            selfWonProjects.length > 0
              ? () => onWon(`${manager.name} · Self`, selfWonProjects)
              : undefined
          }
        />
        <SummaryChip colors={colors} label="From people" value={formatAed(fromPeople, true)} />
        <SummaryChip
          colors={colors}
          label="Pipeline"
          value={formatAed(manager.metrics.pipelineAed, true)}
          onPress={() => onPipeline(manager.name, manager.pipelineProjects)}
        />
      </View>

      {selfWonProjects.length > 0 ? (
        <SelfOwnedBlock
          ownerName={manager.name}
          projects={selfWonProjects}
          colors={colors}
          styles={styles}
          viewerRole={viewerRole}
          onOpenWon={() => onWon(`${manager.name} · Self`, selfWonProjects)}
        />
      ) : null}

      {manager.reps.length > 0 ? (
        <View style={styles.repStack}>
          {manager.reps.map((rep: SalesRepCard) => (
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
  onWon,
  onPipeline,
  onVisits,
}: {
  person: SalesRepCard | ManagerCard;
  role: string;
  currentUserId?: string;
  note?: string;
  onWon: (ownerName: string, projects: ApiProject[]) => void;
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
      onWonPress={() => onWon(person.name, wonProjectsOf(person.scopedProjects))}
      onPipelinePress={() => onPipeline(person.name, person.pipelineProjects)}
      onVisitsPress={() => onVisits(person.name, person.visits)}
    />
  );
}

function SelfOwnedBlock({
  ownerName,
  projects,
  colors,
  styles,
  viewerRole,
  onOpenWon,
}: {
  ownerName: string;
  projects: ApiProject[];
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  viewerRole?: string;
  onOpenWon: () => void;
}) {
  const won = wonProjectsOf(projects);
  if (won.length === 0) return null;

  return (
    <View style={[styles.selfBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
      <View style={styles.selfHeader}>
        <View style={styles.selfTitleRow}>
          <UserRoundX size={16} color={colors.text2} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.selfTitle, { color: colors.text1 }]}>{ownerName} · Self</Text>
            <Text style={{ color: colors.text3, fontSize: 12, marginTop: 2 }}>
              {won.length} won project{won.length === 1 ? "" : "s"} credited to this person.
            </Text>
          </View>
        </View>
        <Pressable onPress={onOpenWon} style={[styles.selfWonBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text1, fontSize: 12, fontWeight: "600" }}>
            Won {formatAed(wonAed(won), true)}
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: 8, marginTop: 12 }}>
        {[...won]
          .sort((a, b) => b.valueAed - a.valueAed)
          .map((project) => (
            <View
              key={project.id}
              style={[styles.selfItem, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text1, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {project.name}
                </Text>
                <Text style={{ color: colors.text3, fontSize: 12, marginTop: 2 }}>
                  {project.city}, {project.country}
                  {project.convertedByName ? ` · Converted by: ${project.convertedByName}` : ""}
                </Text>
              </View>
              <Text style={{ color: colors.text1, fontSize: 12, fontWeight: "700" }}>
                {formatProjectValue(project, viewerRole, true)}
              </Text>
            </View>
          ))}
      </View>
    </View>
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
  onPress,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  warn?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Text style={{ color: warn ? "#b45309" : colors.text3, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ color: warn ? "#92400e" : colors.text1, fontSize: 13, fontWeight: "700", marginTop: 4 }}>
        {value}
      </Text>
    </>
  );
  const style = {
    flexGrow: 1,
    flexBasis: "45%" as const,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: warn ? "rgba(245,158,11,0.4)" : colors.border,
    backgroundColor: warn ? "rgba(245,158,11,0.12)" : colors.surface2,
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
    managerName: {
      fontSize: 15,
      fontWeight: "700",
    },
    managerMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    repStack: {
      gap: 10,
      paddingLeft: 4,
    },
    selfBox: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
    },
    selfHeader: {
      gap: 10,
    },
    selfTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    selfTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    selfWonBtn: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    selfItem: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
  });
}
