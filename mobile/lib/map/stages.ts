import { stageTitle } from "@/lib/constants/stages";

export const STAGE_META: Record<
  string,
  { color: string; tone: "brand" | "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  "Lead Identified": { color: "#E30613", tone: "danger" },
  "Consultant Contacted": { color: "#0EA5E9", tone: "info" },
  Specification: { color: "#8B5CF6", tone: "brand" },
  "Sample Submitted": { color: "#6366F1", tone: "brand" },
  Tender: { color: "#D97706", tone: "warning" },
  Negotiation: { color: "#F97316", tone: "warning" },
  Approved: { color: "#14B8A6", tone: "success" },
  "PO Expected": { color: "#84CC16", tone: "success" },
  Won: { color: "#10B981", tone: "success" },
  Lost: { color: "#6B7280", tone: "neutral" },
};

export const STAGE_LEGEND_ORDER = [
  "Lead Identified",
  "Consultant Contacted",
  "Specification",
  "Sample Submitted",
  "Tender",
  "Negotiation",
  "Approved",
  "PO Expected",
  "Won",
  "Lost",
] as const;

export function mapStageLabel(stage: string) {
  return stageTitle(stage);
}

export function markerColor(stage: string) {
  return STAGE_META[stage]?.color ?? "#E30613";
}

export function stageTone(stage: string): "brand" | "neutral" | "success" | "warning" | "danger" | "info" {
  return STAGE_META[stage]?.tone ?? "neutral";
}

export function markerRadius(valueAed: number) {
  if (valueAed >= 5_000_000) return 10;
  if (valueAed >= 1_000_000) return 8;
  return 6;
}
