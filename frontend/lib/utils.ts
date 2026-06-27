import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAED(value: number, compact = false) {
  if (compact) {
    if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(value: number, currencyCode: string, compact = false) {
  if (currencyCode === 'AED') {
    return formatAED(value, compact);
  }
  if (compact) {
    if (value >= 1_000_000) return `${currencyCode} ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    if (value >= 1_000) return `${currencyCode} ${(value / 1_000).toFixed(0)}K`;
  }
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${formatNumber(value)}`;
  }
}

export type ProjectMoney = {
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
};

/** Legacy rows may have valueAed set while valueLocal stayed 0 after schema push. */
export function effectiveValueLocal(project: ProjectMoney) {
  if (project.valueLocal > 0) return project.valueLocal;
  if (project.valueAed > 0) return project.valueAed;
  return 0;
}

export function formatProjectValue(project: ProjectMoney, viewerRole?: string, compact = false) {
  const localAmount = effectiveValueLocal(project);
  const local = formatCurrency(localAmount, project.currencyCode || 'AED', compact);
  if (viewerRole === 'CEO' || viewerRole === 'ADMIN') {
    if (project.currencyCode === 'AED' || !project.currencyCode) return local;
    return `${formatAED(project.valueAed, compact)} (${local})`;
  }
  return local;
}

export function formatNumber(value: number, maxFractionDigits = 0) {
  return new Intl.NumberFormat('en-AE', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** Parse user-entered values like "1,139,376.50" or "10887.5". */
export function parseFormattedNumber(raw: string): number {
  const normalized = raw.replace(/,/g, '').trim();
  if (!normalized) return NaN;
  return Number(normalized);
}

/** Keep only digits, commas, and a single decimal point while typing. */
export function sanitizeFormattedNumberInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

/** Format a numeric value for commercial input fields. */
export function formatNumberForInput(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function relativeTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < hr) return rtf.format(Math.round(diffMs / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hr), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day');
  if (abs < 365 * day) return rtf.format(Math.round(diffMs / (30 * day)), 'month');
  return rtf.format(Math.round(diffMs / (365 * day)), 'year');
}

export const avatarColors = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
];

export function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarColors[h % avatarColors.length];
}
