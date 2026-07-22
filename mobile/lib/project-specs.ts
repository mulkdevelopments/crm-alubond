export const SPEC_THICKNESS_OPTIONS = ["2mm", "2.5mm", "3mm", "4mm", "5mm", "6mm"] as const;
export const SPEC_CORE_OPTIONS = ["LDPE", "FRB2", "FRB1", "FRA2"] as const;
export const SPEC_PAINT_TYPE_OPTIONS = ["PE", "HDPE", "PVDF", "FEVE"] as const;

export function formatProjectSpecs(thickness: string, core: string, paintType: string) {
  return `${thickness} · ${core} · ${paintType}`;
}

export function commercialSpecsComplete(thickness: string, core: string, paintType: string) {
  return (
    (SPEC_THICKNESS_OPTIONS as readonly string[]).includes(thickness) &&
    (SPEC_CORE_OPTIONS as readonly string[]).includes(core) &&
    (SPEC_PAINT_TYPE_OPTIONS as readonly string[]).includes(paintType)
  );
}

export function formatSpecsSummary(project: {
  specThickness?: string;
  specCore?: string;
  specPaintType?: string;
  itemName?: string;
}) {
  if (commercialSpecsComplete(project.specThickness ?? "", project.specCore ?? "", project.specPaintType ?? "")) {
    return formatProjectSpecs(project.specThickness!, project.specCore!, project.specPaintType!);
  }
  return project.itemName?.trim() ?? "";
}

export function requiresCommercialDetails(stage: string) {
  return ["Tender", "Negotiation", "Approved", "PO Expected", "Won"].includes(stage);
}
