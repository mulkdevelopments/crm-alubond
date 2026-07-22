import type { Role, UserListItem, UserLocationAttendanceDay } from "@/lib/api/auth-api";

export const USERS_PAGE_SIZE = 25;

export const USER_ROLES: Role[] = ["SALES_REP", "MANAGER", "REGIONAL_MANAGER", "CEO", "ADMIN"];

const ROLE_SORT_ORDER: Record<Role, number> = {
  ADMIN: 0,
  CEO: 1,
  REGIONAL_MANAGER: 2,
  MANAGER: 3,
  SALES_REP: 4,
};

export type UserStatusFilter = "ALL" | "live" | "offline";

export function formatOperationLocations(locations: string[]) {
  return locations.length > 0 ? locations.join(", ") : "Not set";
}

export function roleBadgeTone(role: Role): "neutral" | "brand" | "success" | "warning" | "danger" | "info" {
  switch (role) {
    case "ADMIN":
      return "brand";
    case "CEO":
      return "warning";
    case "REGIONAL_MANAGER":
      return "success";
    case "MANAGER":
      return "info";
    case "SALES_REP":
      return "neutral";
    default:
      return "neutral";
  }
}

export function getReportsToLabel(entry: UserListItem): string {
  if (entry.role === "SALES_REP") {
    if (entry.manager) {
      return `${entry.manager.firstName} ${entry.manager.lastName}`.trim();
    }
    if (entry.regionalManager) {
      return `Direct → ${entry.regionalManager.firstName} ${entry.regionalManager.lastName}`.trim();
    }
    return "Not assigned";
  }
  if (entry.role === "MANAGER" && entry.regionalManager) {
    return `${entry.regionalManager.firstName} ${entry.regionalManager.lastName}`.trim();
  }
  if (entry.role === "REGIONAL_MANAGER" && entry.reportsTo) {
    return `${entry.reportsTo.firstName} ${entry.reportsTo.lastName}`.trim();
  }
  return "—";
}

export function effectiveRegionalManagerId(entry: UserListItem, allUsers: UserListItem[]): string | null {
  if (entry.regionalManagerId) return entry.regionalManagerId;
  if (entry.managerId) {
    const manager = allUsers.find((user) => user.id === entry.managerId);
    return manager?.regionalManagerId ?? null;
  }
  return null;
}

export function compareUsersByHierarchy(a: UserListItem, b: UserListItem) {
  const roleDiff = ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role];
  if (roleDiff !== 0) return roleDiff;

  if (a.role === "MANAGER" && b.role === "MANAGER") {
    const rmA = a.regionalManager ? `${a.regionalManager.lastName} ${a.regionalManager.firstName}` : "";
    const rmB = b.regionalManager ? `${b.regionalManager.lastName} ${b.regionalManager.firstName}` : "";
    const rmDiff = rmA.localeCompare(rmB);
    if (rmDiff !== 0) return rmDiff;
  }

  if (a.role === "SALES_REP" && b.role === "SALES_REP") {
    const reportsDiff = getReportsToLabel(a).localeCompare(getReportsToLabel(b));
    if (reportsDiff !== 0) return reportsDiff;
  }

  const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
  const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
  return nameA.localeCompare(nameB);
}

export function isUserLive(lastLocationPingAt: string | null, isActive: boolean) {
  if (!isActive || !lastLocationPingAt) return false;
  const lastSeenMs = new Date(lastLocationPingAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return false;
  return Date.now() - lastSeenMs <= 150_000;
}

export function isUserOnline(lastSeenAt: string | null, isActive: boolean) {
  if (!isActive || !lastSeenAt) return false;
  const lastSeenMs = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return false;
  // Heartbeat every ~60s while logged in; treat <=5 minutes as online.
  return Date.now() - lastSeenMs <= 5 * 60_000;
}

export function wasSeenWithin24Hours(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const lastSeenMs = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return false;
  return Date.now() - lastSeenMs <= 24 * 60 * 60_000;
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

export function filterUsers(
  items: UserListItem[],
  filters: {
    searchQuery: string;
    roleFilter: "ALL" | Role;
    regionalManagerFilter: string;
    managerFilter: string;
    statusFilter: UserStatusFilter;
  },
) {
  const query = filters.searchQuery.trim().toLowerCase();
  return items
    .filter((entry) => {
      if (query) {
        const haystack = `${entry.firstName} ${entry.lastName} ${entry.email}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.roleFilter !== "ALL" && entry.role !== filters.roleFilter) return false;
      if (filters.regionalManagerFilter !== "ALL") {
        const regionalId = effectiveRegionalManagerId(entry, items);
        if (regionalId !== filters.regionalManagerFilter) return false;
      }
      if (filters.managerFilter !== "ALL") {
        if (entry.role === "SALES_REP" && entry.managerId !== filters.managerFilter) return false;
        if (entry.role === "MANAGER" && entry.id !== filters.managerFilter) return false;
        if (entry.role !== "SALES_REP" && entry.role !== "MANAGER") return false;
      }
      if (filters.statusFilter !== "ALL") {
        const live = isUserLive(entry.lastLocationPingAt, entry.isActive);
        if (filters.statusFilter === "live" && !live) return false;
        if (filters.statusFilter === "offline" && live) return false;
      }
      return true;
    })
    .sort(compareUsersByHierarchy);
}

export function buildMonthCalendar(month: string, days: UserLocationAttendanceDay[]) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const startWeekday = start.getDay();
  const dayCount = new Date(year, monthIndex, 0).getDate();
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const cells: Array<{ key: string; date: string | null; dayLabel: string; activeMinutes: number }> = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ key: `pad-${i}`, date: null, dayLabel: "-", activeMinutes: 0 });
  }
  for (let d = 1; d <= dayCount; d++) {
    const date = new Date(Date.UTC(year, monthIndex - 1, d)).toISOString().slice(0, 10);
    const stats = dayMap.get(date);
    cells.push({
      key: date,
      date,
      dayLabel: String(d),
      activeMinutes: stats?.activeMinutes ?? 0,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, date: null, dayLabel: "-", activeMinutes: 0 });
  }
  return cells;
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, monthIndex - 1, 1));
  cursor.setUTCMonth(cursor.getUTCMonth() + delta);
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
