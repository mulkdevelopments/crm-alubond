import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type ProjectRecord = {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: string | null;
  stage: string;
  valueAed: number;
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
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
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
  valueAed: number;
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
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
};

function mapProject(record: {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: string | null;
  stage: string;
  valueAed: number;
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
  owner: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
  managerId: string | null;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export async function listProjects(scope?: Prisma.ProjectWhereInput): Promise<ProjectRecord[]> {
  const records = await prisma.project.findMany({
    where: scope,
    orderBy: { updatedAt: "desc" }
  });
  return records.map(mapProject);
}

export async function getProjectById(projectId: string, scope?: Prisma.ProjectWhereInput): Promise<ProjectRecord | null> {
  const record = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...(scope ?? {}),
    }
  });
  return record ? mapProject(record) : null;
}

export async function createProject(input: UpsertProjectInput): Promise<ProjectRecord> {
  const record = await prisma.project.create({
    data: input
  });
  return mapProject(record);
}

export async function updateProject(projectId: string, input: UpsertProjectInput): Promise<ProjectRecord | null> {
  const exists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true }
  });
  if (!exists) {
    return null;
  }

  const record = await prisma.project.update({
    where: { id: projectId },
    data: input
  });
  return mapProject(record);
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const exists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true }
  });
  if (!exists) {
    return false;
  }

  await prisma.project.delete({
    where: { id: projectId }
  });
  return true;
}
