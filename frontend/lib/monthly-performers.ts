import type { ApiProject } from '@/lib/projects-api';

export type MonthlyPerson = {
  id: string;
  name: string;
  role: string;
  requireDailyVisit?: boolean;
};

export type MonthlyVisit = {
  createdById: string | null;
  createdAt: string;
};

export type MonthlyPerformerRow = {
  id: string;
  name: string;
  role: string;
  wonAed: number;
  visits: number;
  visitDays: number;
  /** Weekdays elapsed in the ranked month (Mon–Fri, MTD for current). */
  expectedVisitDays: number;
  /** visits ÷ expected weekdays; 0 when no weekday baseline. */
  visitAvg: number;
  requireDailyVisit: boolean;
  visitOnTrack: boolean;
  reasons: string[];
};

export type MonthRange = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const TOP_LIMIT = 5;

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Weekdays (Mon–Fri) from start inclusive to end exclusive, capped at end of today for current month. */
export function countExpectedVisitDays(range: MonthRange, now = new Date()) {
  const cap = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const limit = range.end < cap ? range.end : cap;
  let count = 0;
  for (let cursor = new Date(range.start); cursor < limit; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** offset 0 = current month; negative = past months. */
export function monthOffsetToRange(offset: number): MonthRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return {
    key: monthKeyFromDate(start),
    label: start.toLocaleString('en', { month: 'long', year: 'numeric' }),
    start,
    end,
  };
}

function inMonth(iso: string, range: MonthRange) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
}

/**
 * Prefer convertedBy when that person is in the ranked set; else first matching
 * sales rep, then manager, then regional manager id if present on the project.
 */
export function creditOwnerId(
  project: ApiProject,
  peopleIds: Set<string>,
): string | null {
  const credit = project.convertedById?.trim() || null;
  if (credit && peopleIds.has(credit)) return credit;

  const salesRep = project.salesRepIds.find((id) => peopleIds.has(id));
  if (salesRep) return salesRep;

  if (project.managerId && peopleIds.has(project.managerId)) {
    return project.managerId;
  }

  if (project.regionalManagerId && peopleIds.has(project.regionalManagerId)) {
    return project.regionalManagerId;
  }

  return null;
}

export function rankMonthlyPerformers(input: {
  people: MonthlyPerson[];
  projects: ApiProject[];
  visits: MonthlyVisit[];
  monthOffset: number;
}): {
  monthLabel: string;
  monthKey: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  ranked: MonthlyPerformerRow[];
  top: MonthlyPerformerRow[];
  under: MonthlyPerformerRow[];
} {
  const offset = Math.min(0, Math.trunc(input.monthOffset));
  const range = monthOffsetToRange(offset);
  const expectedVisitDays = countExpectedVisitDays(range);
  const peopleIds = new Set(input.people.map((person) => person.id));

  const wonByPerson = new Map<string, number>();
  const visitsByPerson = new Map<string, number>();
  const visitDaysByPerson = new Map<string, Set<string>>();
  for (const person of input.people) {
    wonByPerson.set(person.id, 0);
    visitsByPerson.set(person.id, 0);
    visitDaysByPerson.set(person.id, new Set());
  }

  for (const project of input.projects) {
    if (project.stage !== 'Won') continue;
    if (!inMonth(project.updatedAt, range)) continue;
    const ownerId = creditOwnerId(project, peopleIds);
    if (!ownerId) continue;
    wonByPerson.set(ownerId, (wonByPerson.get(ownerId) ?? 0) + project.valueAed);
  }

  for (const visit of input.visits) {
    if (!visit.createdById || !peopleIds.has(visit.createdById)) continue;
    if (!inMonth(visit.createdAt, range)) continue;
    visitsByPerson.set(visit.createdById, (visitsByPerson.get(visit.createdById) ?? 0) + 1);
    const days = visitDaysByPerson.get(visit.createdById)!;
    days.add(dayKey(new Date(visit.createdAt)));
  }

  const ranked: MonthlyPerformerRow[] = input.people
    .map((person) => {
      const wonAed = wonByPerson.get(person.id) ?? 0;
      const visits = visitsByPerson.get(person.id) ?? 0;
      const visitDays = visitDaysByPerson.get(person.id)?.size ?? 0;
      const requireDailyVisit = Boolean(person.requireDailyVisit);
      const visitAvg = expectedVisitDays > 0 ? visits / expectedVisitDays : 0;
      // Mandate: total visits ≥ weekdays in period (e.g. 21 weekdays → 21 visits), not 1/day.
      const visitOnTrack =
        !requireDailyVisit || expectedVisitDays === 0 || visits >= expectedVisitDays;
      const reasons: string[] = [];
      if (wonAed <= 0) reasons.push('No wins');
      if (requireDailyVisit && !visitOnTrack) {
        reasons.push(`Visits ${visits}/${expectedVisitDays} (need ≥${expectedVisitDays})`);
      }
      return {
        id: person.id,
        name: person.name,
        role: person.role,
        wonAed,
        visits,
        visitDays,
        expectedVisitDays: requireDailyVisit ? expectedVisitDays : 0,
        visitAvg: requireDailyVisit ? visitAvg : 0,
        requireDailyVisit,
        visitOnTrack,
        reasons,
      };
    })
    .sort((a, b) => {
      if (b.wonAed !== a.wonAed) return b.wonAed - a.wonAed;
      if (b.visitAvg !== a.visitAvg) return b.visitAvg - a.visitAvg;
      if (b.visits !== a.visits) return b.visits - a.visits;
      return a.name.localeCompare(b.name);
    });

  const hasAnyWins = ranked.some((row) => row.wonAed > 0);
  const hasVisitMandate = ranked.some((row) => row.requireDailyVisit);

  const top = ranked.filter((row) => row.wonAed > 0).slice(0, TOP_LIMIT);

  const under = ranked
    .filter((row) => {
      const visitFail = row.requireDailyVisit && !row.visitOnTrack;
      const winFail = hasAnyWins && row.wonAed <= 0;
      // When nobody won and nobody has visit mandate, don't invent underperformers.
      if (!hasAnyWins && !hasVisitMandate) return false;
      // Visit-mandate failures always count.
      if (visitFail) return true;
      // Zero-win underperformers only when someone in the month actually won.
      if (winFail) return true;
      return false;
    })
    .sort((a, b) => {
      const aVisitGap = a.requireDailyVisit ? Math.max(0, a.expectedVisitDays - a.visits) : 0;
      const bVisitGap = b.requireDailyVisit ? Math.max(0, b.expectedVisitDays - b.visits) : 0;
      if (bVisitGap !== aVisitGap) return bVisitGap - aVisitGap;
      if (a.wonAed !== b.wonAed) return a.wonAed - b.wonAed;
      return a.name.localeCompare(b.name);
    });

  return {
    monthLabel: range.label,
    monthKey: range.key,
    canGoNext: offset < 0,
    canGoPrev: true,
    ranked,
    top,
    under,
  };
}

export function peopleFromRegionalCards(
  cards: Array<{
    id: string;
    name: string;
    managers: Array<{
      id: string;
      name: string;
      reps: Array<{ id: string; name: string }>;
    }>;
    directReps: Array<{ id: string; name: string }>;
  }>,
  options?: {
    includeRegionalRoots?: boolean;
    requireDailyVisitById?: Record<string, boolean> | Map<string, boolean>;
  },
): MonthlyPerson[] {
  const includeRegionalRoots = options?.includeRegionalRoots !== false;
  const requireMap =
    options?.requireDailyVisitById instanceof Map
      ? options.requireDailyVisitById
      : new Map(Object.entries(options?.requireDailyVisitById ?? {}));
  const byId = new Map<string, MonthlyPerson>();

  function normalizeId(id: string) {
    const colon = id.indexOf(':');
    return colon === -1 ? id : id.slice(0, colon);
  }

  function addPerson(id: string, name: string, role: string) {
    const personId = normalizeId(id);
    byId.set(personId, {
      id: personId,
      name,
      role,
      requireDailyVisit: requireMap.get(personId) ?? false,
    });
  }

  for (const regional of cards) {
    if (includeRegionalRoots) {
      addPerson(regional.id, regional.name, 'Regional manager');
    }
    for (const manager of regional.managers) {
      addPerson(manager.id, manager.name, 'Manager');
      for (const rep of manager.reps) {
        addPerson(rep.id, rep.name, 'Sales rep');
      }
    }
    for (const rep of regional.directReps) {
      addPerson(rep.id, rep.name, 'Sales rep');
    }
  }

  return Array.from(byId.values());
}
