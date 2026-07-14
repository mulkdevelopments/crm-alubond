import type { UserListItem } from "@/lib/api/auth-api";
import type { ApiProject } from "@/lib/api/projects-api";
import { STAGES } from "@/lib/constants/stages";

export function buildMonthlyTrend(projects: ApiProject[], users: UserListItem[]) {
  const now = new Date();
  const labels = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, month: date.toLocaleString("en", { month: "short" }) };
  });

  const fallbackTargetM =
    users
      .filter((user) => user.role === "SALES_REP")
      .reduce((sum, user) => sum + ((user.yearlyTarget ?? 0) / 12), 0) / 1_000_000;

  return labels.map((entry) => {
    const achievedM =
      projects
        .filter((project) => {
          if (project.stage !== "Won") return false;
          const date = new Date(project.updatedAt);
          const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
          return key === entry.key;
        })
        .reduce((sum, project) => sum + project.valueAed, 0) / 1_000_000;

    return {
      month: entry.month,
      target: Number((fallbackTargetM > 0 ? fallbackTargetM : Math.max(1, achievedM * 1.1)).toFixed(1)),
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
