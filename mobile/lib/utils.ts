export function normalizeOptionalId(value: string | null | undefined) {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

export function formatAed(value: number, compact = false) {
  if (compact && value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M AED`;
  }
  return new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(value) + " AED";
}

export function formatCurrency(value: number, currencyCode: string, compact = false) {
  if (currencyCode === "AED") {
    return formatAed(value, compact);
  }
  if (compact) {
    if (value >= 1_000_000) {
      return `${currencyCode} ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    }
    if (value >= 1_000) {
      return `${currencyCode} ${(value / 1_000).toFixed(0)}K`;
    }
  }
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${new Intl.NumberFormat("en-AE").format(value)}`;
  }
}

export type ProjectMoney = {
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
};

export function effectiveValueLocal(project: ProjectMoney) {
  if (project.valueLocal > 0) return project.valueLocal;
  if (project.valueAed > 0) return project.valueAed;
  return 0;
}

export function formatProjectValue(project: ProjectMoney, viewerRole?: string, compact = false) {
  const localAmount = effectiveValueLocal(project);
  const local = formatCurrency(localAmount, project.currencyCode || "AED", compact);
  if (viewerRole === "CEO" || viewerRole === "ADMIN") {
    if (project.currencyCode === "AED" || !project.currencyCode) return local;
    return `${formatAed(project.valueAed, compact)} (${local})`;
  }
  return local;
}

export function parseFormattedNumber(raw: string): number {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return NaN;
  return Number(normalized);
}

export function sanitizeFormattedNumberInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  return cleaned;
}

export function formatNumberForInput(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatStage(stage: string) {
  if (stage === "Tender") return "Quotation";
  if (stage === "PO Expected") return "PO awaited";
  return stage;
}

export function stageColor(stage: string) {
  switch (stage) {
    case "Won":
      return "#059669";
    case "Lost":
      return "#dc2626";
    case "Tender":
    case "Negotiation":
      return "#d97706";
    default:
      return "#2563eb";
  }
}
