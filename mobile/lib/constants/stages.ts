export type Stage =
  | "Lead Identified"
  | "Consultant Contacted"
  | "Specification"
  | "Sample Submitted"
  | "Tender"
  | "Negotiation"
  | "Approved"
  | "PO Expected"
  | "Won"
  | "Lost";

export const STAGES: Stage[] = [
  "Lead Identified",
  "Consultant Contacted",
  "Specification",
  "Sample Submitted",
  "Tender",
  "Negotiation",
  "Approved",
  "PO Expected",
];

export const ALL_STAGES: Stage[] = [...STAGES, "Won", "Lost"];

export const PIPELINE_VISIBLE_STAGES: Stage[] = ALL_STAGES.filter((stage) => stage !== "Approved");

export const BUSINESS_DIVISIONS = ["alubond architecture", "alubond transport", "uniqube"] as const;

export function stageTitle(stage: string) {
  if (stage === "Tender") return "Quotation";
  if (stage === "PO Expected") return "po awaited";
  if (stage === "Lost") return "Loss";
  if (stage === "Won") return "Win";
  return stage;
}

export function stageDotColor(stage: string) {
  const colors: Record<string, string> = {
    "Lead Identified": "#9CA3AF",
    "Consultant Contacted": "#0EA5E9",
    Specification: "#8B5CF6",
    "Sample Submitted": "#6366F1",
    Tender: "#F59E0B",
    Negotiation: "#F97316",
    Approved: "#14B8A6",
    "PO Expected": "#10B981",
    Won: "#059669",
    Lost: "#F43F5E",
  };
  return colors[stage] ?? "#9CA3AF";
}

export function normalizePipelineStage(stage: string): Stage {
  const normalized = stage === "Approved" ? "PO Expected" : stage;
  return (ALL_STAGES.includes(normalized as Stage) ? normalized : "Lead Identified") as Stage;
}
