import { Prisma } from "@prisma/client";
import { deleteProjectAttachmentFiles } from "../../lib/attachment-cleanup";
import { prisma } from "../../lib/prisma";

export type ProjectRecord = {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: string | null;
  stage: string;
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
  fxRateToAed: number;
  fxRateAppliedAt: string;
  itemName: string;
  itemQuantity: number;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  lossReason: string | null;
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  convertedById: string | null;
  convertedByName: string | null;
  createdById: string | null;
  createdByName: string | null;
  deletedAt: string | null;
  deletedById: string | null;
  deletedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertProjectInput = {
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: string | null;
  stage: string;
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
  fxRateToAed: number;
  fxRateAppliedAt: Date;
  itemName: string;
  itemQuantity: number;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  lossReason: string | null;
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  convertedById: string | null;
  convertedByName: string | null;
};

export type CreateProjectInput = UpsertProjectInput & {
  createdById?: string | null;
  createdByName?: string | null;
};

export const notDeletedWhere: Prisma.ProjectWhereInput = { deletedAt: null };
export const trashedWhere: Prisma.ProjectWhereInput = { deletedAt: { not: null } };

export function mergeProjectWhere(
  ...parts: Array<Prisma.ProjectWhereInput | undefined | null>
): Prisma.ProjectWhereInput {
  const filtered = parts.filter((part): part is Prisma.ProjectWhereInput => Boolean(part && Object.keys(part).length > 0));
  if (filtered.length === 0) return {};
  if (filtered.length === 1) return filtered[0]!;
  return { AND: filtered };
}

function mapProject(record: {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: string | null;
  stage: string;
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
  fxRateToAed: number;
  fxRateAppliedAt: Date;
  itemName: string;
  itemQuantity: number;
  specThickness: string;
  specCore: string;
  specPaintType: string;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  lossReason: string | null;
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  convertedById: string | null;
  convertedByName: string | null;
  createdById: string | null;
  createdByName: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deletedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord {
  return {
    ...record,
    fxRateAppliedAt: record.fxRateAppliedAt.toISOString(),
    deletedAt: record.deletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listProjects(scope?: Prisma.ProjectWhereInput): Promise<ProjectRecord[]> {
  const records = await prisma.project.findMany({
    where: mergeProjectWhere(notDeletedWhere, scope),
    orderBy: { updatedAt: "desc" },
  });
  return records.map(mapProject);
}

export async function listTrashedProjects(scope?: Prisma.ProjectWhereInput): Promise<ProjectRecord[]> {
  const records = await prisma.project.findMany({
    where: mergeProjectWhere(trashedWhere, scope),
    orderBy: { deletedAt: "desc" },
  });
  return records.map(mapProject);
}

export async function getProjectById(
  projectId: string,
  scope?: Prisma.ProjectWhereInput,
  options?: { includeTrashed?: boolean },
): Promise<ProjectRecord | null> {
  const record = await prisma.project.findFirst({
    where: mergeProjectWhere(
      { id: projectId },
      options?.includeTrashed ? undefined : notDeletedWhere,
      scope,
    ),
  });
  return record ? mapProject(record) : null;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const record = await prisma.project.create({
    data: input,
  });
  return mapProject(record);
}

export async function updateProject(projectId: string, input: UpsertProjectInput): Promise<ProjectRecord | null> {
  const exists = await prisma.project.findFirst({
    where: mergeProjectWhere({ id: projectId }, notDeletedWhere),
    select: { id: true },
  });
  if (!exists) {
    return null;
  }

  const record = await prisma.project.update({
    where: { id: projectId },
    data: input,
  });
  return mapProject(record);
}

export async function trashProject(
  projectId: string,
  deletedBy?: { id: string; name: string },
): Promise<ProjectRecord | null> {
  const exists = await prisma.project.findFirst({
    where: mergeProjectWhere({ id: projectId }, notDeletedWhere),
    select: { id: true },
  });
  if (!exists) {
    return null;
  }

  const record = await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: new Date(),
      deletedById: deletedBy?.id ?? null,
      deletedByName: deletedBy?.name ?? null,
    },
  });
  return mapProject(record);
}

export async function restoreProject(projectId: string): Promise<ProjectRecord | null> {
  const exists = await prisma.project.findFirst({
    where: mergeProjectWhere({ id: projectId }, trashedWhere),
    select: { id: true },
  });
  if (!exists) {
    return null;
  }

  const record = await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: null,
      deletedById: null,
      deletedByName: null,
    },
  });
  return mapProject(record);
}

/** Permanently remove a trashed project and its cascaded relations. Admin only at the route layer. */
export async function hardDeleteProject(projectId: string): Promise<boolean> {
  const exists = await prisma.project.findFirst({
    where: mergeProjectWhere({ id: projectId }, trashedWhere),
    select: { id: true },
  });
  if (!exists) {
    return false;
  }

  try {
    await deleteProjectAttachmentFiles(projectId);
  } catch (error) {
    console.error(`Failed to delete attachment files for project ${projectId}:`, error);
  }

  await prisma.project.delete({
    where: { id: projectId },
  });
  return true;
}

/** @deprecated Use trashProject / hardDeleteProject */
export async function deleteProject(projectId: string): Promise<boolean> {
  return hardDeleteProject(projectId);
}
