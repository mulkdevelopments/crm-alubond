import type { UserListItem } from "@/lib/auth-api";
import type { ApiProject, ProjectActivity } from "@/lib/projects-api";

export type NodeMetrics = {
  assignedTargetAed: number | null;
  assignedAttainmentPct: number;
  targetAed: number;
  achievedAed: number;
  pipelineAed: number;
  conversionPct: number;
  attainmentPct: number;
  visitsWeek: number;
  visitsTotal: number;
  totalProjects: number;
};

export type FlatActivity = {
  id: string;
  projectId: string;
  type: ProjectActivity["type"];
  message: string;
  visitWhatHappened: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type PresenceInfo = {
  online: boolean;
  presenceLabel: string;
};

export type SalesRepCard = {
  id: string;
  name: string;
  location: string;
  online: boolean;
  presenceLabel: string;
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
  scopedProjects: ApiProject[];
};

export type ManagerCard = {
  id: string;
  name: string;
  location: string;
  online?: boolean;
  presenceLabel?: string;
  reps: SalesRepCard[];
  /** Won/pipeline projects on this manager with no sales rep assigned. */
  unassignedProjects: ApiProject[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
  scopedProjects: ApiProject[];
};

export type RegionalCard = {
  id: string;
  name: string;
  location: string;
  online?: boolean;
  presenceLabel?: string;
  managers: ManagerCard[];
  /** Sales reps who report directly to the regional manager (no middle manager). */
  directReps: SalesRepCard[];
  /** Projects linked to this regional with no manager and no sales rep. */
  unassignedProjects: ApiProject[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
  /** All projects included in this card's metrics (won + pipeline + lost). */
  scopedProjects: ApiProject[];
};

function formatLocations(locations: string[]) {
  return locations.length > 0 ? locations.join(", ") : "Not set";
}

export function nameInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function isUserOnline(lastSeenAt: string | null | undefined, isActive = true) {
  if (!isActive || !lastSeenAt) return false;
  const lastSeenMs = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return false;
  // Heartbeat every ~60s while logged in; treat <=5 minutes as online.
  return Date.now() - lastSeenMs <= 5 * 60_000;
}

export function formatLastSeen(timestamp: string) {
  const ts = new Date(timestamp).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const diffMs = Math.max(0, Date.now() - ts);
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleString("en-AE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function presenceForUser(user: {
  lastSeenAt?: string | null;
  isActive?: boolean;
}): PresenceInfo {
  const online = isUserOnline(user.lastSeenAt, user.isActive !== false);
  if (online) return { online: true, presenceLabel: "Online" };
  if (user.lastSeenAt) return { online: false, presenceLabel: `Last login ${formatLastSeen(user.lastSeenAt)}` };
  return { online: false, presenceLabel: "Never logged in" };
}

function mergeProjects(...lists: ApiProject[][]) {
  const byId = new Map<string, ApiProject>();
  for (const list of lists) {
    for (const project of list) {
      byId.set(project.id, project);
    }
  }
  return [...byId.values()];
}

function visitsForProjects(activities: FlatActivity[], projects: ApiProject[], createdById?: string) {
  const projectIds = new Set(projects.map((project) => project.id));
  return activities.filter((activity) => {
    if (activity.type !== "visit" || !projectIds.has(activity.projectId)) return false;
    if (createdById && activity.createdById !== createdById) return false;
    return true;
  });
}

function pipelineOnly(projects: ApiProject[]) {
  return projects.filter((project) => project.stage !== "Won" && project.stage !== "Lost");
}

function computeMetrics(
  projects: ApiProject[],
  assignedTargetInput: number | null | undefined,
  teamTargetInput: number | null | undefined,
  visits: FlatActivity[],
): NodeMetrics {
  const wonProjects = projects.filter((project) => project.stage === "Won");
  const activeProjects = pipelineOnly(projects);
  const achievedAed = wonProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const pipelineAed = activeProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const assignedTargetAed = assignedTargetInput && assignedTargetInput > 0 ? assignedTargetInput : null;
  const targetAed =
    teamTargetInput && teamTargetInput > 0
      ? teamTargetInput
      : Math.max(1_000_000, Math.round((achievedAed + pipelineAed) * 0.55));
  const assignedAttainmentPct = assignedTargetAed ? Math.round((achievedAed / assignedTargetAed) * 100) : 0;
  const attainmentPct = Math.round((achievedAed / targetAed) * 100);
  const conversionPct = projects.length ? Math.round((wonProjects.length / projects.length) * 100) : 0;
  const weekStartMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const visitsWeek = visits.filter((visit) => {
    const ts = new Date(visit.createdAt).getTime();
    return Number.isFinite(ts) && ts >= weekStartMs;
  }).length;

  return {
    assignedTargetAed,
    assignedAttainmentPct: Number.isFinite(assignedAttainmentPct) ? assignedAttainmentPct : 0,
    targetAed,
    achievedAed,
    pipelineAed,
    conversionPct,
    attainmentPct: Number.isFinite(attainmentPct) ? attainmentPct : 0,
    visitsWeek,
    visitsTotal: visits.length,
    totalProjects: projects.length,
  };
}

/**
 * Exclusive project ownership under a regional manager so parent totals
 * equal the sum of child cards (no double-count, no hidden orphans).
 */
function partitionRegionalProjects(input: {
  projects: ApiProject[];
  regionalId: string;
  managerUsers: UserListItem[];
  repsByManager: Map<string, UserListItem[]>;
  directRepUsers: UserListItem[];
}) {
  const managerIdSet = new Set(input.managerUsers.map((manager) => manager.id));
  const repToManager = new Map<string, string>();
  for (const manager of input.managerUsers) {
    for (const rep of input.repsByManager.get(manager.id) ?? []) {
      repToManager.set(rep.id, manager.id);
    }
  }
  const directRepIds = new Set(input.directRepUsers.map((rep) => rep.id));

  const inScope = input.projects.filter((project) => {
    if (project.regionalManagerId === input.regionalId) return true;
    if (project.managerId && managerIdSet.has(project.managerId)) return true;
    return project.salesRepIds.some((id) => repToManager.has(id) || directRepIds.has(id));
  });

  const byManagerId = new Map<string, ApiProject[]>();
  const byDirectRepId = new Map<string, ApiProject[]>();
  const unassigned: ApiProject[] = [];

  for (const project of inScope) {
    const creditId = project.convertedById?.trim() || null;

    if (creditId && directRepIds.has(creditId)) {
      const list = byDirectRepId.get(creditId) ?? [];
      list.push(project);
      byDirectRepId.set(creditId, list);
      continue;
    }

    if (creditId && repToManager.has(creditId)) {
      const managerId = repToManager.get(creditId)!;
      const list = byManagerId.get(managerId) ?? [];
      list.push(project);
      byManagerId.set(managerId, list);
      continue;
    }

    if (creditId && managerIdSet.has(creditId)) {
      const list = byManagerId.get(creditId) ?? [];
      list.push(project);
      byManagerId.set(creditId, list);
      continue;
    }

    // RM personally converted (or only RM on the deal) → self bucket for this regional.
    if (creditId && creditId === input.regionalId) {
      unassigned.push(project);
      continue;
    }

    const directRepId = project.salesRepIds.find((id) => directRepIds.has(id));
    if (directRepId) {
      const list = byDirectRepId.get(directRepId) ?? [];
      list.push(project);
      byDirectRepId.set(directRepId, list);
      continue;
    }

    const managerViaRep = project.salesRepIds.map((id) => repToManager.get(id)).find(Boolean);
    if (managerViaRep) {
      const list = byManagerId.get(managerViaRep) ?? [];
      list.push(project);
      byManagerId.set(managerViaRep, list);
      continue;
    }

    if (project.managerId && managerIdSet.has(project.managerId)) {
      const list = byManagerId.get(project.managerId) ?? [];
      list.push(project);
      byManagerId.set(project.managerId, list);
      continue;
    }

    unassigned.push(project);
  }

  return { byManagerId, byDirectRepId, unassigned, inScope };
}

function partitionManagerProjectsAmongReps(managerProjects: ApiProject[], repIds: string[]) {
  const repIdSet = new Set(repIds);
  const byRepId = new Map<string, ApiProject[]>();
  const managerOnly: ApiProject[] = [];

  for (const project of managerProjects) {
    const creditId = project.convertedById?.trim() || null;
    if (creditId && repIdSet.has(creditId)) {
      const list = byRepId.get(creditId) ?? [];
      list.push(project);
      byRepId.set(creditId, list);
      continue;
    }

    const matchedRepId = project.salesRepIds.find((id) => repIdSet.has(id));
    if (matchedRepId && !creditId) {
      const list = byRepId.get(matchedRepId) ?? [];
      list.push(project);
      byRepId.set(matchedRepId, list);
      continue;
    }
    managerOnly.push(project);
  }

  return { byRepId, managerOnly };
}

function buildRepCard(
  rep: UserListItem,
  projects: ApiProject[],
  activities: FlatActivity[],
): SalesRepCard {
  const visits = visitsForProjects(activities, projects, rep.id);
  const presence = presenceForUser(rep);
  return {
    id: rep.id,
    name: `${rep.firstName} ${rep.lastName}`.trim(),
    location: formatLocations(rep.operationLocations),
    online: presence.online,
    presenceLabel: presence.presenceLabel,
    metrics: computeMetrics(projects, rep.yearlyTarget, rep.yearlyTarget, visits),
    visits,
    pipelineProjects: pipelineOnly(projects),
    scopedProjects: projects,
  };
}

export function buildHierarchy(
  users: UserListItem[],
  projects: ApiProject[],
  activities: FlatActivity[],
): RegionalCard[] {
  const regionals = users.filter((user) => user.role === "REGIONAL_MANAGER");
  const managers = users.filter((user) => user.role === "MANAGER");
  const reps = users.filter((user) => user.role === "SALES_REP");

  const managersByRegional = new Map<string, UserListItem[]>();
  for (const manager of managers) {
    if (!manager.regionalManagerId) continue;
    const list = managersByRegional.get(manager.regionalManagerId) ?? [];
    list.push(manager);
    managersByRegional.set(manager.regionalManagerId, list);
  }

  const repsByManager = new Map<string, UserListItem[]>();
  for (const rep of reps) {
    if (!rep.managerId) continue;
    const list = repsByManager.get(rep.managerId) ?? [];
    list.push(rep);
    repsByManager.set(rep.managerId, list);
  }

  const directRepsByRegional = new Map<string, UserListItem[]>();
  for (const rep of reps) {
    if (rep.managerId || !rep.regionalManagerId) continue;
    const list = directRepsByRegional.get(rep.regionalManagerId) ?? [];
    list.push(rep);
    directRepsByRegional.set(rep.regionalManagerId, list);
  }

  type RegionalSeed = {
    id: string;
    firstName: string;
    lastName: string;
    regions: string[];
    operationLocations: string[];
    yearlyTarget: number | null;
    isActive: boolean;
    lastSeenAt: string | null;
  };

  const regionalSeeds: RegionalSeed[] = regionals.map((regional) => ({
    id: regional.id,
    firstName: regional.firstName,
    lastName: regional.lastName,
    regions: regional.regions,
    operationLocations: regional.operationLocations,
    yearlyTarget: regional.yearlyTarget,
    isActive: regional.isActive,
    lastSeenAt: regional.lastSeenAt,
  }));

  const existingRegionalIds = new Set(regionalSeeds.map((regional) => regional.id));
  const missingRegionalIds = Array.from(
    new Set(
      managers
        .map((manager) => manager.regionalManagerId)
        .filter((regionalId): regionalId is string => regionalId !== null)
        .filter((regionalId) => !existingRegionalIds.has(regionalId)),
    ),
  );

  for (const regionalId of missingRegionalIds) {
    const linkedManager = managers.find((manager) => manager.regionalManagerId === regionalId);
    regionalSeeds.push({
      id: regionalId,
      firstName: linkedManager?.regionalManager?.firstName ?? "Regional",
      lastName: linkedManager?.regionalManager?.lastName ?? "Manager",
      regions: [],
      operationLocations: linkedManager?.operationLocations?.length
        ? linkedManager.operationLocations
        : ["Regional coverage"],
      yearlyTarget: null,
      isActive: true,
      lastSeenAt: null,
    });
  }

  return regionalSeeds.map((regional) => {
    const managerUsers = managersByRegional.get(regional.id) ?? [];
    const directRepUsers = directRepsByRegional.get(regional.id) ?? [];
    const { byManagerId, byDirectRepId, unassigned, inScope } = partitionRegionalProjects({
      projects,
      regionalId: regional.id,
      managerUsers,
      repsByManager,
      directRepUsers,
    });

    const managerCards: ManagerCard[] = managerUsers.map((manager) => {
      const managerRepUsers = repsByManager.get(manager.id) ?? [];
      const managerProjects = byManagerId.get(manager.id) ?? [];
      const { byRepId, managerOnly } = partitionManagerProjectsAmongReps(
        managerProjects,
        managerRepUsers.map((rep) => rep.id),
      );
      const repCards = managerRepUsers.map((rep) =>
        buildRepCard(rep, byRepId.get(rep.id) ?? [], activities),
      );
      const targetFromReps = repCards.reduce(
        (sum, rep) => sum + (rep.metrics.assignedTargetAed ?? rep.metrics.targetAed),
        0,
      );
      const managerVisits = visitsForProjects(activities, managerProjects);
      const managerPresence = presenceForUser(manager);
      return {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`.trim(),
        location: formatLocations(manager.operationLocations),
        online: managerPresence.online,
        presenceLabel: managerPresence.presenceLabel,
        reps: repCards,
        unassignedProjects: managerOnly,
        metrics: computeMetrics(
          managerProjects,
          manager.yearlyTarget,
          targetFromReps || manager.yearlyTarget,
          managerVisits,
        ),
        visits: managerVisits,
        pipelineProjects: pipelineOnly(managerProjects),
        scopedProjects: managerProjects,
      };
    });

    const directRepCards = directRepUsers.map((rep) =>
      buildRepCard(rep, byDirectRepId.get(rep.id) ?? [], activities),
    );

    const regionalProjects = inScope;
    const regionalVisits = visitsForProjects(activities, regionalProjects);
    const peopleTarget =
      managerCards.reduce(
        (sum, manager) => sum + (manager.metrics.assignedTargetAed ?? manager.metrics.targetAed),
        0,
      ) +
      directRepCards.reduce(
        (sum, rep) => sum + (rep.metrics.assignedTargetAed ?? rep.metrics.targetAed),
        0,
      );
    const regionalPresence = presenceForUser(regional);
    return {
      id: regional.id,
      name: `${regional.firstName} ${regional.lastName}`.trim(),
      location: regional.regions.join(", ") || formatLocations(regional.operationLocations) || "Regional coverage",
      online: regionalPresence.online,
      presenceLabel: regionalPresence.presenceLabel,
      managers: managerCards,
      directReps: directRepCards,
      unassignedProjects: unassigned,
      metrics: computeMetrics(
        regionalProjects,
        regional.yearlyTarget,
        peopleTarget || regional.yearlyTarget,
        regionalVisits,
      ),
      visits: regionalVisits,
      pipelineProjects: pipelineOnly(regionalProjects),
      scopedProjects: regionalProjects,
    };
  });
}

export function progressAccent(pct: number, variant: "team" | "assigned" = "team") {
  if (pct >= 100) return "#34d399";
  if (pct >= 75) return "#fbbf24";
  return variant === "assigned" ? "#E30613" : "#f43f5e";
}

function normalizePlaceKey(value: string) {
  return value.trim().toLowerCase();
}

function placesMatch(a: string, b: string) {
  const left = normalizePlaceKey(a);
  const right = normalizePlaceKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const aliases: Record<string, string[]> = {
    uae: ["united arab emirates"],
    "united arab emirates": ["uae"],
    ksa: ["saudi arabia"],
    "saudi arabia": ["ksa"],
  };
  return (aliases[left] ?? []).includes(right) || (aliases[right] ?? []).includes(left);
}

function projectMatchesRegion(project: ApiProject, regionName: string) {
  return placesMatch(project.country, regionName);
}

/**
 * Top-level cards grouped by operating region.
 * Metrics only include projects owned by covering regional managers (not global country totals).
 * Parent achieved always equals the unique union of child manager cards.
 */
export function buildRegionHierarchy(
  users: UserListItem[],
  projects: ApiProject[],
  activities: FlatActivity[],
): RegionalCard[] {
  const byManager = buildHierarchy(users, projects, activities);
  const regionals = users.filter((user) => user.role === "REGIONAL_MANAGER");
  const managers = users.filter((user) => user.role === "MANAGER");
  const reps = users.filter((user) => user.role === "SALES_REP");

  const regionNames = Array.from(
    new Set(
      regionals.flatMap((regional) =>
        regional.regions.map((region) => region.trim()).filter(Boolean),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return regionNames.map((regionName) => {
    const coveringRegionals = byManager.filter((card) => {
      const regional = regionals.find((user) => user.id === card.id);
      return Boolean(regional?.regions.some((region) => placesMatch(region, regionName)));
    });

    // Only projects already attributed to covering RMs, then filter by country.
    const coveringProjects = mergeProjects(...coveringRegionals.map((card) => card.scopedProjects));
    const regionProjects = coveringProjects.filter((project) => projectMatchesRegion(project, regionName));
    const regionProjectIds = new Set(regionProjects.map((project) => project.id));

    const managerCards: ManagerCard[] = [];
    const directRepCards: SalesRepCard[] = [];
    const unassignedProjects: ApiProject[] = [];

    for (const regionalCard of coveringRegionals) {
      for (const manager of regionalCard.managers) {
        const managerUser = managers.find((entry) => entry.id === manager.id);
        const managerRegionProjects = manager.scopedProjects.filter((project) => regionProjectIds.has(project.id));
        const managerUnassigned = manager.unassignedProjects.filter((project) => regionProjectIds.has(project.id));

        const repCards = manager.reps
          .map((rep) => {
            const user = reps.find((entry) => entry.id === rep.id);
            const useProjects = rep.scopedProjects.filter((project) => regionProjectIds.has(project.id));
            if (useProjects.length === 0) return null;
            const visits = visitsForProjects(activities, useProjects, rep.id);
            return {
              ...rep,
              metrics: computeMetrics(useProjects, user?.yearlyTarget, user?.yearlyTarget, visits),
              visits,
              pipelineProjects: pipelineOnly(useProjects),
              scopedProjects: useProjects,
            } satisfies SalesRepCard;
          })
          .filter((rep): rep is SalesRepCard => Boolean(rep));

        if (managerRegionProjects.length === 0 && repCards.length === 0) {
          continue;
        }

        const managerVisits = visitsForProjects(activities, managerRegionProjects);
        const targetFromReps = repCards.reduce(
          (sum, rep) => sum + (rep.metrics.assignedTargetAed ?? rep.metrics.targetAed),
          0,
        );

        managerCards.push({
          id: `${manager.id}:${normalizePlaceKey(regionName)}`,
          name: manager.name,
          location: formatLocations(managerUser?.operationLocations ?? []) || regionName,
          online: manager.online,
          presenceLabel: manager.presenceLabel,
          reps: repCards,
          unassignedProjects: managerUnassigned,
          metrics: computeMetrics(
            managerRegionProjects,
            managerUser?.yearlyTarget,
            targetFromReps || managerUser?.yearlyTarget || null,
            managerVisits,
          ),
          visits: managerVisits,
          pipelineProjects: pipelineOnly(managerRegionProjects),
          scopedProjects: managerRegionProjects,
        });
      }

      for (const rep of regionalCard.directReps) {
        const user = reps.find((entry) => entry.id === rep.id);
        const useProjects = rep.scopedProjects.filter((project) => regionProjectIds.has(project.id));
        if (useProjects.length === 0) continue;
        const visits = visitsForProjects(activities, useProjects, rep.id);
        directRepCards.push({
          ...rep,
          metrics: computeMetrics(useProjects, user?.yearlyTarget, user?.yearlyTarget, visits),
          visits,
          pipelineProjects: pipelineOnly(useProjects),
          scopedProjects: useProjects,
        });
      }

      unassignedProjects.push(
        ...regionalCard.unassignedProjects.filter((project) => regionProjectIds.has(project.id)),
      );
    }

    const uniqueUnassigned = mergeProjects(unassignedProjects);

    // Parent metrics = unique union of people + unassigned (guarantees rollup matches).
    const rolledUpProjects = mergeProjects(
      ...managerCards.map((manager) => manager.scopedProjects),
      ...directRepCards.map((rep) => rep.scopedProjects),
      uniqueUnassigned,
    );
    const regionVisits = visitsForProjects(activities, rolledUpProjects);
    const coveringNames = coveringRegionals.map((card) => card.name);
    const onlineCount = coveringRegionals.filter((card) => card.online).length;
    const assignedTarget = coveringRegionals.reduce((sum, card) => {
      const regional = regionals.find((user) => user.id === card.id);
      const regionCount = Math.max(1, regional?.regions.length ?? 1);
      const yearly = regional?.yearlyTarget && regional.yearlyTarget > 0 ? regional.yearlyTarget : 0;
      return sum + yearly / regionCount;
    }, 0);
    const peopleTarget =
      managerCards.reduce(
        (sum, manager) => sum + (manager.metrics.assignedTargetAed ?? manager.metrics.targetAed),
        0,
      ) +
      directRepCards.reduce(
        (sum, rep) => sum + (rep.metrics.assignedTargetAed ?? rep.metrics.targetAed),
        0,
      );
    const teamTarget = peopleTarget || assignedTarget || null;

    return {
      id: `region:${normalizePlaceKey(regionName)}`,
      name: regionName,
      location:
        coveringNames.length > 0
          ? `Managed by ${coveringNames.join(", ")}`
          : "No regional manager assigned",
      online: onlineCount > 0,
      presenceLabel:
        coveringRegionals.length === 0
          ? undefined
          : onlineCount > 0
            ? `${onlineCount}/${coveringRegionals.length} managers online`
            : `${coveringRegionals.length} regional manager${coveringRegionals.length === 1 ? "" : "s"}`,
      managers: managerCards,
      directReps: directRepCards,
      unassignedProjects: uniqueUnassigned,
      metrics: computeMetrics(rolledUpProjects, assignedTarget || null, teamTarget, regionVisits),
      visits: regionVisits,
      pipelineProjects: pipelineOnly(rolledUpProjects),
      scopedProjects: rolledUpProjects,
    } satisfies RegionalCard;
  });
}
