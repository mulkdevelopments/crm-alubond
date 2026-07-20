import type { UserListItem } from "@/lib/api/auth-api";
import type { ApiProject } from "@/lib/api/projects-api";
import { STAGES } from "@/lib/constants/stages";

export type TargetOwner = Pick<UserListItem, "id" | "role" | "yearlyTarget">;

export type MonthlyTrendPoint = {
  month: string;
  target: number;
  achieved: number;
};

export function resolveTargetOwner(
  currentUserId: string | null | undefined,
  currentUserRole: UserListItem["role"] | null | undefined,
  users: UserListItem[]
): TargetOwner | null {
  if (!currentUserId || !currentUserRole) return null;

  const owner =
    currentUserRole === "ADMIN"
      ? users.find((entry) => entry.role === "CEO" && (entry.yearlyTarget ?? 0) > 0) ?? null
      : users.find((entry) => entry.id === currentUserId) ?? null;

  if (!owner || !owner.yearlyTarget || owner.yearlyTarget <= 0) return null;
  return owner;
}

export function filterWonForOwner(
  owner: TargetOwner,
  users: UserListItem[],
  projects: ApiProject[]
): ApiProject[] {
  const wonProjects = projects.filter((project) => project.stage === "Won");

  if (owner.role === "CEO") return wonProjects;

  if (owner.role === "REGIONAL_MANAGER") {
    const managerIds = new Set(
      users
        .filter((entry) => entry.role === "MANAGER" && entry.regionalManagerId === owner.id)
        .map((entry) => entry.id)
    );
    return wonProjects.filter(
      (project) => project.managerId != null && managerIds.has(project.managerId)
    );
  }

  if (owner.role === "MANAGER") {
    return wonProjects.filter((project) => project.managerId === owner.id);
  }

  if (owner.role === "SALES_REP") {
    return wonProjects.filter((project) => project.salesRepIds.includes(owner.id));
  }

  return [];
}

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyTrend(params: {
  projects: ApiProject[];
  users: UserListItem[];
  currentUserId?: string | null;
  currentUserRole?: UserListItem["role"] | null;
}): MonthlyTrendPoint[] {
  const { projects, users, currentUserId, currentUserRole } = params;
  const now = new Date();
  const labels = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return { key: monthKeyFromDate(date), month: date.toLocaleString("en", { month: "short" }) };
  });

  const owner = resolveTargetOwner(currentUserId, currentUserRole, users);
  const monthlyTargetM = owner?.yearlyTarget ? owner.yearlyTarget / 12 / 1_000_000 : 0;
  const scopedWon = owner ? filterWonForOwner(owner, users, projects) : [];

  return labels.map((entry) => {
    const achievedM =
      scopedWon
        .filter((project) => monthKeyFromDate(new Date(project.updatedAt)) === entry.key)
        .reduce((sum, project) => sum + project.valueAed, 0) / 1_000_000;

    const target = monthlyTargetM > 0 ? monthlyTargetM : Math.max(1, achievedM * 1.1);

    return {
      month: entry.month,
      target: Number(target.toFixed(1)),
      achieved: Number(achievedM.toFixed(1)),
    };
  });
}

export function buildLossBreakdown(projects: ApiProject[]) {
  const lost = projects.filter((project) => project.stage === "Lost");
  if (!lost.length) return [{ reason: "No losses", value: 100 }];

  const buckets = new Map<string, number>();
  for (const project of lost) {
    const reason = project.lossReason?.trim()
      || (project.competitor ? `vs ${project.competitor}` : "No reason captured");
    buckets.set(reason, (buckets.get(reason) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([reason, count]) => ({ reason, value: Math.round((count / lost.length) * 100) }))
    .sort((a, b) => b.value - a.value);
}

export function buildStageFunnel(projects: ApiProject[]) {
  return STAGES.map((stage) => {
    const inStage = projects.filter((project) => project.stage === stage);
    return {
      stage,
      count: inStage.length,
      value: inStage.reduce((sum, project) => sum + project.valueAed, 0),
    };
  });
}

export function relativeTimeFromIso(iso: string) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Unknown";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString("en-AE", { month: "short", day: "2-digit" });
}

export function isLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const ts = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 150_000;
}
