import type { UserListItem } from "@/lib/api/auth-api";
import type { ApiProject, ProjectActivity } from "@/lib/api/projects-api";

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

export type SalesRepCard = {
  id: string;
  name: string;
  location: string;
  online: boolean;
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
};

export type ManagerCard = {
  id: string;
  name: string;
  location: string;
  reps: SalesRepCard[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
};

export type RegionalCard = {
  id: string;
  name: string;
  location: string;
  managers: ManagerCard[];
  metrics: NodeMetrics;
  visits: FlatActivity[];
  pipelineProjects: ApiProject[];
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

function isLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const ts = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 150_000;
}

function projectsForRep(projects: ApiProject[], repId: string) {
  return projects.filter((project) => project.salesRepIds.includes(repId));
}

function isUnattributedDirectRegionalProject(project: ApiProject, regionalId: string) {
  return project.regionalManagerId === regionalId && !project.managerId && project.salesRepIds.length === 0;
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

function projectsForDirectRep(
  projects: ApiProject[],
  rep: UserListItem,
  regionalId: string,
  soleDirectRep: boolean,
) {
  const assigned = projectsForRep(projects, rep.id);
  if (!soleDirectRep) return assigned;
  const unattributed = projects.filter((project) => isUnattributedDirectRegionalProject(project, regionalId));
  return mergeProjects(assigned, unattributed);
}

function projectsForManager(projects: ApiProject[], managerId: string, repIds: string[]) {
  const repIdSet = new Set(repIds);
  return projects.filter(
    (project) =>
      project.managerId === managerId || project.salesRepIds.some((salesRepId) => repIdSet.has(salesRepId)),
  );
}

function projectsForRegional(
  projects: ApiProject[],
  regionalId: string,
  managerIds: Set<string>,
  repIds: Set<string>,
) {
  return projects.filter((project) => {
    if (project.regionalManagerId === regionalId) return true;
    if (project.managerId != null && managerIds.has(project.managerId)) return true;
    return project.salesRepIds.some((salesRepId) => repIds.has(salesRepId));
  });
}

function computeMetrics(
  projects: ApiProject[],
  assignedTargetInput: number | null | undefined,
  teamTargetInput: number | null | undefined,
  visits: FlatActivity[],
): NodeMetrics {
  const wonProjects = projects.filter((project) => project.stage === "Won");
  const activeProjects = projects.filter((project) => project.stage !== "Won" && project.stage !== "Lost");
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
  };

  const regionalSeeds: RegionalSeed[] = regionals.map((regional) => ({
    id: regional.id,
    firstName: regional.firstName,
    lastName: regional.lastName,
    regions: regional.regions,
    operationLocations: regional.operationLocations,
    yearlyTarget: regional.yearlyTarget,
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
    });
  }

  return regionalSeeds.map((regional) => {
    const managerUsers = managersByRegional.get(regional.id) ?? [];
    const managerCards = managerUsers.map((manager) => {
      const managerRepUsers = repsByManager.get(manager.id) ?? [];
      const managerRepIds = managerRepUsers.map((rep) => rep.id);
      const managerProjects = projectsForManager(projects, manager.id, managerRepIds);
      const managerProjectIds = managerProjects.map((project) => project.id);
      const managerVisits = activities.filter(
        (activity) => activity.type === "visit" && managerProjectIds.includes(activity.projectId),
      );
      const repCards = managerRepUsers.map((rep) => {
        const repProjects = projectsForRep(projects, rep.id);
        const repProjectIds = repProjects.map((project) => project.id);
        const repPipelineProjects = repProjects.filter(
          (project) => project.stage !== "Won" && project.stage !== "Lost",
        );
        const repVisits = activities.filter(
          (activity) =>
            activity.type === "visit" &&
            activity.createdById === rep.id &&
            repProjectIds.includes(activity.projectId),
        );
        return {
          id: rep.id,
          name: `${rep.firstName} ${rep.lastName}`.trim(),
          location: formatLocations(rep.operationLocations),
          online: isLive(rep.lastLocationPingAt, rep.isActive),
          metrics: computeMetrics(repProjects, rep.yearlyTarget, rep.yearlyTarget, repVisits),
          visits: repVisits,
          pipelineProjects: repPipelineProjects,
        };
      });
      const targetFromReps = repCards.reduce((sum, rep) => sum + rep.metrics.targetAed, 0);
      const managerPipelineProjects = managerProjects.filter(
        (project) => project.stage !== "Won" && project.stage !== "Lost",
      );
      return {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`.trim(),
        location: formatLocations(manager.operationLocations),
        reps: repCards,
        metrics: computeMetrics(
          managerProjects,
          manager.yearlyTarget,
          targetFromReps || manager.yearlyTarget,
          managerVisits,
        ),
        visits: managerVisits,
        pipelineProjects: managerPipelineProjects,
      };
    });

    const directRepUsers = directRepsByRegional.get(regional.id) ?? [];
    const soleDirectRep = directRepUsers.length === 1;

    const directRepCards = directRepUsers.map((rep) => {
      const repProjects = projectsForDirectRep(projects, rep, regional.id, soleDirectRep);
      const repProjectIds = repProjects.map((project) => project.id);
      const repPipelineProjects = repProjects.filter(
        (project) => project.stage !== "Won" && project.stage !== "Lost",
      );
      const repVisits = activities.filter(
        (activity) =>
          activity.type === "visit" &&
          activity.createdById === rep.id &&
          repProjectIds.includes(activity.projectId),
      );
      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`.trim(),
        location: formatLocations(rep.operationLocations),
        online: isLive(rep.lastLocationPingAt, rep.isActive),
        metrics: computeMetrics(repProjects, rep.yearlyTarget, rep.yearlyTarget, repVisits),
        visits: repVisits,
        pipelineProjects: repPipelineProjects,
      };
    });

    if (directRepCards.length > 0) {
      const directVisits = directRepCards.flatMap((rep) => rep.visits);
      const directProjects = mergeProjects(
        ...directRepUsers.map((rep) => projectsForDirectRep(projects, rep, regional.id, soleDirectRep)),
      );
      const directTarget = directRepCards.reduce((sum, rep) => sum + rep.metrics.targetAed, 0);
      managerCards.unshift({
        id: `regional-direct-${regional.id}`,
        name: "Direct regional reports",
        location: regional.regions.join(", ") || formatLocations(regional.operationLocations) || "Regional coverage",
        reps: directRepCards,
        metrics: computeMetrics(directProjects, directTarget || null, directTarget || null, directVisits),
        visits: directVisits,
        pipelineProjects: directProjects.filter((project) => project.stage !== "Won" && project.stage !== "Lost"),
      });
    }

    const managerIds = new Set(
      managerCards.map((manager) => manager.id).filter((id) => !id.startsWith("regional-direct-")),
    );
    const repIdsUnderRegional = new Set(managerCards.flatMap((manager) => manager.reps.map((rep) => rep.id)));
    const regionalProjects = projectsForRegional(projects, regional.id, managerIds, repIdsUnderRegional);
    const regionalProjectIds = new Set(regionalProjects.map((project) => project.id));
    const regionalPipelineProjects = regionalProjects.filter(
      (project) => project.stage !== "Won" && project.stage !== "Lost",
    );
    const regionalVisits = activities.filter(
      (activity) => activity.type === "visit" && regionalProjectIds.has(activity.projectId),
    );
    const targetFromManagers = managerCards.reduce((sum, manager) => sum + manager.metrics.targetAed, 0);
    return {
      id: regional.id,
      name: `${regional.firstName} ${regional.lastName}`.trim(),
      location: regional.regions.join(", ") || formatLocations(regional.operationLocations) || "Regional coverage",
      managers: managerCards,
      metrics: computeMetrics(
        regionalProjects,
        regional.yearlyTarget,
        targetFromManagers || regional.yearlyTarget,
        regionalVisits,
      ),
      visits: regionalVisits,
      pipelineProjects: regionalPipelineProjects,
    };
  });
}

export function progressAccent(pct: number, variant: "team" | "assigned" = "team") {
  if (pct >= 100) return "#34d399";
  if (pct >= 75) return "#fbbf24";
  return variant === "assigned" ? "#E30613" : "#f43f5e";
}
