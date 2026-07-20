import type { UserListItem } from '@/lib/auth-api';
import type { ApiProject } from '@/lib/projects-api';

export type TargetOwner = Pick<UserListItem, 'id' | 'role' | 'yearlyTarget'>;

export type MonthlyTrendPoint = {
  month: string;
  target: number;
  achieved: number;
};

export function resolveTargetOwner(
  currentUserId: string | null | undefined,
  currentUserRole: UserListItem['role'] | null | undefined,
  users: UserListItem[]
): TargetOwner | null {
  if (!currentUserId || !currentUserRole) return null;

  const owner =
    currentUserRole === 'ADMIN'
      ? users.find((entry) => entry.role === 'CEO' && (entry.yearlyTarget ?? 0) > 0) ?? null
      : users.find((entry) => entry.id === currentUserId) ?? null;

  if (!owner || !owner.yearlyTarget || owner.yearlyTarget <= 0) return null;
  return owner;
}

export function filterWonForOwner(
  owner: TargetOwner,
  users: UserListItem[],
  projects: ApiProject[]
): ApiProject[] {
  const wonProjects = projects.filter((project) => project.stage === 'Won');

  if (owner.role === 'CEO') return wonProjects;

  if (owner.role === 'REGIONAL_MANAGER') {
    const managerIds = new Set(
      users
        .filter((entry) => entry.role === 'MANAGER' && entry.regionalManagerId === owner.id)
        .map((entry) => entry.id)
    );
    return wonProjects.filter(
      (project) => project.managerId != null && managerIds.has(project.managerId)
    );
  }

  if (owner.role === 'MANAGER') {
    return wonProjects.filter((project) => project.managerId === owner.id);
  }

  if (owner.role === 'SALES_REP') {
    return wonProjects.filter((project) => project.salesRepIds.includes(owner.id));
  }

  return [];
}

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlyTrend(params: {
  projects: ApiProject[];
  users: UserListItem[];
  currentUserId?: string | null;
  currentUserRole?: UserListItem['role'] | null;
}): MonthlyTrendPoint[] {
  const { projects, users, currentUserId, currentUserRole } = params;
  const now = new Date();
  const labels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    return { key: monthKeyFromDate(d), month: d.toLocaleString('en', { month: 'short' }) };
  });

  const owner = resolveTargetOwner(currentUserId, currentUserRole, users);
  const monthlyTargetM = owner?.yearlyTarget ? owner.yearlyTarget / 12 / 1_000_000 : 0;
  const scopedWon = owner ? filterWonForOwner(owner, users, projects) : [];

  return labels.map((entry) => {
    const achievedM =
      scopedWon
        .filter((project) => monthKeyFromDate(new Date(project.updatedAt)) === entry.key)
        .reduce((sum, project) => sum + project.valueAed, 0) / 1_000_000;

    const target =
      monthlyTargetM > 0
        ? monthlyTargetM
        : Math.max(1, achievedM * 1.1);

    return {
      month: entry.month,
      target: Number(target.toFixed(1)),
      achieved: Number(achievedM.toFixed(1)),
    };
  });
}
