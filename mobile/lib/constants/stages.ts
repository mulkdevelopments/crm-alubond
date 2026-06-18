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

export const BUSINESS_DIVISIONS = ["alubond architecture", "alubond transport", "uniqube"] as const;
