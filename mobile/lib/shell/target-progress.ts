import type { AuthUser, UserListItem } from "@/lib/api/auth-api";
import type { ApiProject } from "@/lib/api/projects-api";

export type TargetProgress = {
  label: string;
  targetAed: number;
  achievedAed: number;
  percent: number;
};

export function resolveTargetProgress(
  currentUserId: string | null,
  currentUserRole: AuthUser["role"] | null,
  users: UserListItem[],
  projects: ApiProject[]
): TargetProgress | null {
  if (!currentUserId || !currentUserRole) return null;

  const owner =
    currentUserRole === "ADMIN"
      ? users.find((entry) => entry.role === "CEO" && (entry.yearlyTarget ?? 0) > 0) ?? null
      : users.find((entry) => entry.id === currentUserId) ?? null;
  if (!owner || !owner.yearlyTarget || owner.yearlyTarget <= 0) return null;

  const wonProjects = projects.filter((project) => project.stage === "Won");
  const relevantWonProjects =
    owner.role === "CEO"
      ? wonProjects
      : owner.role === "REGIONAL_MANAGER"
        ? (() => {
            const managerIds = new Set(
              users
                .filter((entry) => entry.role === "MANAGER" && entry.regionalManagerId === owner.id)
                .map((entry) => entry.id)
            );
            return wonProjects.filter(
              (project) => project.managerId != null && managerIds.has(project.managerId)
            );
          })()
        : owner.role === "MANAGER"
          ? wonProjects.filter((project) => project.managerId === owner.id)
          : owner.role === "SALES_REP"
            ? wonProjects.filter((project) => project.salesRepIds.includes(owner.id))
            : [];

  const achievedAed = relevantWonProjects.reduce((sum, project) => sum + project.valueAed, 0);
  const percent = Math.round((achievedAed / owner.yearlyTarget) * 100);

  return {
    label: `Goal ${new Date().getFullYear()}`,
    targetAed: owner.yearlyTarget,
    achievedAed,
    percent: Number.isFinite(percent) ? percent : 0,
  };
}

export function formatCompactAedValue(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

export function relativeAgo(iso: string, nowMs: number) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const diffSec = Math.max(0, Math.round((nowMs - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
