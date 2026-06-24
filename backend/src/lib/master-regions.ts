import { prisma } from "./prisma";

export const DEFAULT_MASTER_REGIONS = [
  "South India",
  "Sri Lanka",
  "UAE",
  "KSA",
  "Qatar",
  "GCC",
] as const;

export async function listActiveMasterRegionNames(): Promise<string[]> {
  const rows = await prisma.masterRegion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return rows.map((row) => row.name);
}

export async function validateMasterRegionValues(params: {
  operationLocations?: string[];
  regions?: string[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const activeNames = new Set(await listActiveMasterRegionNames());

  if (params.operationLocations) {
    const invalid = params.operationLocations.filter((entry) => !activeNames.has(entry));
    if (invalid.length > 0) {
      return {
        ok: false,
        message: `Invalid operation locations: ${invalid.join(", ")}. Choose active regions from Master Data.`,
      };
    }
  }

  if (params.regions) {
    const invalid = params.regions.filter((entry) => !activeNames.has(entry));
    if (invalid.length > 0) {
      return {
        ok: false,
        message: `Invalid regions: ${invalid.join(", ")}. Choose active regions from Master Data.`,
      };
    }
  }

  return { ok: true };
}
