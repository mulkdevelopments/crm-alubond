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
