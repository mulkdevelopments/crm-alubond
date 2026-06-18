import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import multer from "multer";
import { z } from "zod";

import { env } from "../config/env";
import { storeUploadedFile } from "../lib/file-storage";
import { isEmailConfigured, sendFollowUpNotificationById } from "../lib/followup-notifier";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { generateAssistantResponse } from "../modules/ai/ai.service";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject
} from "../modules/projects/projects.repository";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";

export const apiRouter = Router();
const entityIdSchema = z.string().min(3).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const optionalEntityIdSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  entityIdSchema.nullable().optional()
);
const activityAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const projectPayloadSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().optional().default(""),
  developer: z.string().optional().default(""),
  businessDivision: z.enum(["alubond architecture", "alubond transport", "uniqube"]).nullable().optional(),
  stage: z.string().min(1),
  valueAed: z.number().min(0).optional().default(0),
  itemName: z.string().trim().max(120).optional().default(""),
  itemQuantity: z.number().int().min(0).optional().default(0),
  lat: z.number().gte(-90).lte(90).optional().default(0),
  lng: z.number().gte(-180).lte(180).optional().default(0),
  probability: z.number().min(0).max(100).optional().default(0),
  daysInStage: z.number().int().min(0).optional().default(1),
  competitor: z.string().nullable().optional().default(null),
  regionalManagerId: optionalEntityIdSchema,
  managerId: optionalEntityIdSchema,
  salesRepIds: z.array(entityIdSchema).optional().default([])
});

const tenderOrLaterStages = new Set(["Tender", "Negotiation", "Approved", "PO Expected", "Won", "Lost"]);

function requiresCommercialDetails(stage: string) {
  return tenderOrLaterStages.has(stage);
}

function canManageProjects(role: UserRole) {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.CEO ||
    role === UserRole.MANAGER ||
    role === UserRole.REGIONAL_MANAGER
  );
}

function projectScopeForUser(user: { id: string; role: UserRole }): Prisma.ProjectWhereInput | undefined {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return undefined;
  }
  if (user.role === UserRole.REGIONAL_MANAGER) {
    return {
      OR: [{ regionalManagerId: user.id }, { manager: { regionalManagerId: user.id } }]
    };
  }
  if (user.role === UserRole.MANAGER) {
    return { managerId: user.id };
  }
  return { salesRepIds: { has: user.id } };
}

async function canAccessProjectById(
  user: { id: string; role: UserRole },
  projectId: string
): Promise<boolean> {
  const scope = projectScopeForUser(user);
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...(scope ?? {}),
    },
    select: { id: true },
  });
  return Boolean(project);
}

const projectActivitySchema = z.object({
  type: z.enum(["note", "call", "visit", "email", "whatsapp", "stage"]),
  message: z.string().min(1).max(1000),
  followUpDueAt: z.string().datetime().optional(),
  visitWhatHappened: z.string().trim().min(1).max(1000).optional(),
  visitLocation: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
      accuracyM: z.number().positive().nullable().optional(),
    })
    .optional(),
  attachments: z.array(
    z.object({
      kind: z.enum(["file", "voice"]),
      name: z.string().min(1).max(255),
      filename: z.string().min(1).max(255),
      size: z.number().int().positive(),
      mimeType: z.string().min(1).max(255),
      url: z.string().min(1).max(512),
    })
  ).optional(),
});
const projectActivityUpdateSchema = z.object({
  type: z.enum(["note", "call", "visit", "email", "whatsapp", "stage"]),
  message: z.string().min(1).max(1000),
  visitWhatHappened: z.string().trim().min(1).max(1000).optional().nullable(),
});

const stakeholderSchema = z.object({
  role: z.enum(["Architect", "Consultant", "Contractor", "Fabricator", "Developer", "Other"]),
  name: z.string().min(1).max(120),
  organization: z.string().max(160).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable()
});

const followUpChannelSchema = z.enum(["Call", "Visit", "WhatsApp", "Email", "Meeting"]);
const followUpStatusSchema = z.enum(["Overdue", "Due today", "Upcoming", "Done"]);
const followUpCreateSchema = z.object({
  projectId: entityIdSchema,
  ownerId: entityIdSchema.optional().nullable(),
  contact: z.string().min(1).max(120),
  contactRole: z.string().min(1).max(120),
  dueAt: z.string().datetime(),
  channel: followUpChannelSchema,
  note: z.string().min(1).max(1000),
});
const followUpUpdateSchema = z.object({
  dueAt: z.string().datetime().optional(),
  channel: followUpChannelSchema.optional(),
  status: followUpStatusSchema.optional(),
  note: z.string().min(1).max(1000).optional(),
});
const assistantChatSchema = z.object({
  question: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

function projectActivityDelegate(): {
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  delete: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
} | null {
  const delegate = (prisma as unknown as { projectActivity?: unknown }).projectActivity;
  if (!delegate || typeof delegate !== "object") {
    return null;
  }
  const candidate = delegate as {
    findMany?: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    create?: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    findUnique?: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    delete?: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    update?: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  if (!candidate.findMany || !candidate.create || !candidate.findUnique || !candidate.delete || !candidate.update) {
    return null;
  }
  return {
    findMany: candidate.findMany,
    create: candidate.create,
    findUnique: candidate.findUnique,
    delete: candidate.delete,
    update: candidate.update
  };
}

function projectStakeholderDelegate(): {
  findMany: (args: { where: { projectId: string }; orderBy: { createdAt: "desc" } }) => Promise<unknown[]>;
  findUnique: (args: { where: { id: string } }) => Promise<{
    id: string;
    projectId: string;
  } | null>;
  create: (args: {
    data: {
      projectId: string;
      role: "Architect" | "Consultant" | "Contractor" | "Fabricator" | "Developer" | "Other";
      name: string;
      organization: string | null;
      email: string | null;
      phone: string | null;
      createdById: string;
      createdByName: string | null;
    };
  }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    data: {
      role: "Architect" | "Consultant" | "Contractor" | "Fabricator" | "Developer" | "Other";
      name: string;
      organization: string | null;
      email: string | null;
      phone: string | null;
    };
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
} | null {
  const delegate = (prisma as unknown as { projectStakeholder?: unknown }).projectStakeholder;
  if (!delegate || typeof delegate !== "object") {
    return null;
  }
  const candidate = delegate as {
    findMany?: (args: { where: { projectId: string }; orderBy: { createdAt: "desc" } }) => Promise<unknown[]>;
    findUnique?: (args: { where: { id: string } }) => Promise<{ id: string; projectId: string } | null>;
    create?: (args: {
      data: {
        projectId: string;
        role: "Architect" | "Consultant" | "Contractor" | "Fabricator" | "Developer" | "Other";
        name: string;
        organization: string | null;
        email: string | null;
        phone: string | null;
        createdById: string;
        createdByName: string | null;
      };
    }) => Promise<unknown>;
    update?: (args: {
      where: { id: string };
      data: {
        role: "Architect" | "Consultant" | "Contractor" | "Fabricator" | "Developer" | "Other";
        name: string;
        organization: string | null;
        email: string | null;
        phone: string | null;
      };
    }) => Promise<unknown>;
    delete?: (args: { where: { id: string } }) => Promise<unknown>;
  };
  if (!candidate.findMany || !candidate.findUnique || !candidate.create || !candidate.update || !candidate.delete) {
    return null;
  }
  return {
    findMany: candidate.findMany,
    findUnique: candidate.findUnique,
    create: candidate.create,
    update: candidate.update,
    delete: candidate.delete
  };
}

function followUpDelegate(): {
  findMany: (args: {
    where?: Prisma.FollowUpWhereInput;
    include: {
      project: { select: { id: true; name: true } };
      owner: { select: { id: true; firstName: true; lastName: true } };
    };
    orderBy: Array<{ status: "asc" } | { dueAt: "asc" }>;
  }) => Promise<Array<{
    id: string;
    projectId: string;
    ownerId: string | null;
    contact: string;
    contactRole: string;
    dueAt: Date;
    channel: string;
    status: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
    project: { id: string; name: string };
    owner: { id: string; firstName: string; lastName: string } | null;
  }>>;
  create: (args: {
    data: {
      projectId: string;
      sourceActivityId?: string;
      ownerId: string;
      contact: string;
      contactRole: string;
      dueAt: Date;
      channel: "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting";
      status: "Overdue" | "Upcoming";
      note: string;
    };
  }) => Promise<unknown>;
  findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  deleteMany: (args: { where: { sourceActivityId: string } }) => Promise<{ count: number }>;
  update: (args: {
    where: { id: string };
    data: {
      dueAt?: Date;
      channel?: "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting";
      status?: "Overdue" | "Due today" | "Upcoming" | "Done";
      note?: string;
    };
  }) => Promise<unknown>;
} | null {
  const delegate = (prisma as unknown as { followUp?: unknown }).followUp;
  if (!delegate || typeof delegate !== "object") return null;
  const candidate = delegate as {
    findMany?: (args: {
      where?: Prisma.FollowUpWhereInput;
      include: {
        project: { select: { id: true; name: true } };
        owner: { select: { id: true; firstName: true; lastName: true } };
      };
      orderBy: Array<{ status: "asc" } | { dueAt: "asc" }>;
    }) => Promise<Array<{
      id: string;
      projectId: string;
      ownerId: string | null;
      contact: string;
      contactRole: string;
      dueAt: Date;
      channel: string;
      status: string;
      note: string;
      createdAt: Date;
      updatedAt: Date;
      project: { id: string; name: string };
      owner: { id: string; firstName: string; lastName: string } | null;
    }>>;
    create?: (args: {
      data: {
        projectId: string;
        sourceActivityId?: string;
        ownerId: string;
        contact: string;
        contactRole: string;
        dueAt: Date;
        channel: "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting";
        status: "Overdue" | "Upcoming";
        note: string;
      };
    }) => Promise<unknown>;
    findUnique?: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
    deleteMany?: (args: { where: { sourceActivityId: string } }) => Promise<{ count: number }>;
    update?: (args: {
      where: { id: string };
      data: {
        dueAt?: Date;
        channel?: "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting";
        status?: "Overdue" | "Due today" | "Upcoming" | "Done";
        note?: string;
      };
    }) => Promise<unknown>;
  };
  if (!candidate.findMany || !candidate.create || !candidate.findUnique || !candidate.update || !candidate.deleteMany) return null;
  return {
    findMany: candidate.findMany,
    create: candidate.create,
    findUnique: candidate.findUnique,
    deleteMany: candidate.deleteMany,
    update: candidate.update,
  };
}

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "alubond-crm-api",
    emailConfigured: isEmailConfigured(),
    timestamp: new Date().toISOString()
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);

apiRouter.post("/ai/assistant", authenticate, async (req, res) => {
  const parsed = assistantChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const answer = await generateAssistantResponse({
      user: req.user,
      question: parsed.data.question,
      history: parsed.data.history,
    });
    res.status(200).json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate assistant response";
    res.status(500).json({ message });
  }
});

apiRouter.get("/files/proxy", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  if (!rawUrl) {
    res.status(400).json({ message: "url query is required" });
    return;
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    res.status(400).json({ message: "Invalid url" });
    return;
  }

  const isBlobHost = /(^|\.)blob\.vercel-storage\.com$/i.test(target.hostname);
  if (!isBlobHost || target.protocol !== "https:") {
    res.status(400).json({ message: "Only Vercel Blob URLs are supported" });
    return;
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ message: "Blob token is not configured" });
    return;
  }

  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}`,
  };
  const range = req.headers.range;
  if (typeof range === "string" && range.length > 0) {
    upstreamHeaders.Range = range;
  }

  const upstream = await fetch(target.toString(), {
    method: "GET",
    headers: upstreamHeaders,
  });

  if (!upstream.ok) {
    res.status(upstream.status).json({ message: "Unable to fetch file" });
    return;
  }

  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");
  const cacheControl = upstream.headers.get("cache-control");
  const contentDisposition = upstream.headers.get("content-disposition");

  if (contentType) res.setHeader("Content-Type", contentType);
  if (contentLength) res.setHeader("Content-Length", contentLength);
  if (contentRange) res.setHeader("Content-Range", contentRange);
  if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
  if (cacheControl) res.setHeader("Cache-Control", cacheControl);
  if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);

  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status).send(body);
});

apiRouter.post(
  "/uploads/activity-attachment",
  authenticate,
  activityAttachmentUpload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "File is required" });
      return;
    }
    try {
      const stored = await storeUploadedFile(req.file);
      const kind = stored.mimeType.startsWith("audio/") ? "voice" : "file";
      res.status(201).json({
        file: {
          kind,
          ...stored,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to store file";
      res.status(500).json({ message });
    }
  }
);

apiRouter.get("/projects", authenticate, async (req, res) => {
  const scope = projectScopeForUser(req.user!);
  res.status(200).json({
    items: await listProjects(scope)
  });
});

apiRouter.get("/projects/:projectId", authenticate, async (req, res) => {
  const scope = projectScopeForUser(req.user!);
  const project = await getProjectById(req.params.projectId as string, scope);
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  res.status(200).json({ project });
});

async function resolveProjectAssignees(payload: z.infer<typeof projectPayloadSchema>) {
  let regionalManagerId = payload.regionalManagerId ?? null;
  let managerId = payload.managerId ?? null;
  const salesRepIds = payload.salesRepIds ?? [];

  let regionalManagerName = "";
  if (regionalManagerId) {
    const regionalManager = await prisma.user.findUnique({
      where: { id: regionalManagerId },
      select: { id: true, firstName: true, lastName: true, role: true }
    });

    if (!regionalManager || regionalManager.role !== UserRole.REGIONAL_MANAGER) {
      return { error: "regionalManagerId must belong to a regional manager user" } as const;
    }

    regionalManagerName = `${regionalManager.firstName} ${regionalManager.lastName}`.trim();
  }

  let managerName = "";
  let managerRegionalManagerId: string | null = null;
  if (managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        regionalManagerId: true
      }
    });

    if (!manager || manager.role !== UserRole.MANAGER) {
      return { error: "managerId must belong to a manager user" } as const;
    }

    if (regionalManagerId && manager.regionalManagerId !== regionalManagerId) {
      return { error: "Manager must belong to the selected regional manager" } as const;
    }

    managerName = `${manager.firstName} ${manager.lastName}`.trim();
    managerRegionalManagerId = manager.regionalManagerId ?? null;
    if (!regionalManagerId && managerRegionalManagerId) {
      regionalManagerId = managerRegionalManagerId;
      const linkedRegionalManager = await prisma.user.findUnique({
        where: { id: managerRegionalManagerId },
        select: { firstName: true, lastName: true }
      });
      regionalManagerName = linkedRegionalManager
        ? `${linkedRegionalManager.firstName} ${linkedRegionalManager.lastName}`.trim()
        : "";
    }
  }

  const reps = salesRepIds.length
    ? await prisma.user.findMany({
        where: { id: { in: salesRepIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          managerId: true,
          regionalManagerId: true
        }
      })
    : [];

  if (reps.length !== salesRepIds.length) {
    return { error: "One or more sales reps are invalid" } as const;
  }

  const invalidRep = reps.find((rep) => {
    if (rep.role !== UserRole.SALES_REP) return true;
    if (managerId) {
      if (rep.managerId === managerId) return false;
      return !(
        managerRegionalManagerId &&
        rep.managerId === null &&
        rep.regionalManagerId === managerRegionalManagerId
      );
    }
    if (regionalManagerId) {
      return !(rep.managerId === null && rep.regionalManagerId === regionalManagerId);
    }
    return false;
  });
  if (invalidRep) {
    return { error: "Sales reps must belong to the selected manager or regional manager" } as const;
  }

  const salesRepNames = reps.map((rep) => `${rep.firstName} ${rep.lastName}`.trim());
  const owner = salesRepNames[0] ?? managerName ?? regionalManagerName ?? "Unassigned";

  return {
    regionalManagerId,
    regionalManagerName,
    managerId,
    managerName,
    salesRepIds,
    salesRepNames,
    owner
  } as const;
}

async function assertProjectAssignmentAllowed(
  user: { id: string; role: UserRole; regionalManagerId?: string | null },
  payload: z.infer<typeof projectPayloadSchema>
) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return null;
  }

  if (user.role === UserRole.REGIONAL_MANAGER) {
    if (payload.regionalManagerId && payload.regionalManagerId !== user.id) {
      return "Regional managers can only assign themselves as regional manager";
    }
    if (payload.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: payload.managerId },
        select: { regionalManagerId: true }
      });
      if (!manager || manager.regionalManagerId !== user.id) {
        return "Managers must belong to your regional team";
      }
    }
    return null;
  }

  if (user.role === UserRole.MANAGER) {
    if (payload.managerId && payload.managerId !== user.id) {
      return "Managers can only assign projects to themselves";
    }
    if (payload.regionalManagerId) {
      const manager = await prisma.user.findUnique({
        where: { id: user.id },
        select: { regionalManagerId: true }
      });
      if (payload.regionalManagerId !== (manager?.regionalManagerId ?? null)) {
        return "Regional manager assignment is outside your hierarchy";
      }
    }
    return null;
  }

  return "Forbidden for your role";
}

function applyCreatorProjectDefaults(
  user: { id: string; role: UserRole; regionalManagerId?: string | null },
  payload: z.infer<typeof projectPayloadSchema>
): z.infer<typeof projectPayloadSchema> {
  if (user.role === UserRole.MANAGER && !payload.managerId) {
    return { ...payload, managerId: user.id };
  }
  if (user.role === UserRole.REGIONAL_MANAGER && !payload.regionalManagerId && !payload.managerId) {
    return { ...payload, regionalManagerId: user.id };
  }
  return payload;
}

apiRouter.post("/projects", authenticate, async (req, res) => {
  if (!req.user || !canManageProjects(req.user.role)) {
    res.status(403).json({ message: "Only admins, CEOs, managers, and regional managers can create projects" });
    return;
  }

  const parsed = projectPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }
  const payload = applyCreatorProjectDefaults(req.user, parsed.data);

  const assignmentError = await assertProjectAssignmentAllowed(req.user, payload);
  if (assignmentError) {
    res.status(403).json({ message: assignmentError });
    return;
  }

  const itemName = payload.itemName.trim();
  if (requiresCommercialDetails(payload.stage) && payload.valueAed <= 0) {
    res.status(400).json({ message: "Project value is required for Tender stage and later." });
    return;
  }
  if (requiresCommercialDetails(payload.stage) && !itemName) {
    res.status(400).json({ message: "Item name is required for Tender stage and later." });
    return;
  }
  if (requiresCommercialDetails(payload.stage) && payload.itemQuantity <= 0) {
    res.status(400).json({ message: "Item quantity is required for Tender stage and later." });
    return;
  }

  const assignees = await resolveProjectAssignees(payload);
  if ("error" in assignees) {
    res.status(400).json({ message: assignees.error });
    return;
  }

  const project = await createProject({
    ...payload,
    businessDivision: payload.businessDivision ?? null,
    itemName,
    regionalManagerId: assignees.regionalManagerId,
    regionalManagerName: assignees.regionalManagerName,
    managerId: assignees.managerId,
    managerName: assignees.managerName,
    owner: assignees.owner,
    salesRepIds: assignees.salesRepIds,
    salesRepNames: assignees.salesRepNames
  });

  res.status(201).json({ project });
});

apiRouter.patch("/projects/:projectId", authenticate, async (req, res) => {
  if (!req.user || !canManageProjects(req.user.role)) {
    res.status(403).json({ message: "Only admins, CEOs, managers, and regional managers can update projects" });
    return;
  }
  if (!(await canAccessProjectById(req.user, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const parsed = projectPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const existingProject = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: {
      id: true,
      regionalManagerId: true,
      regionalManagerName: true,
      managerId: true,
      managerName: true,
      salesRepIds: true,
      salesRepNames: true,
      owner: true,
    },
  });
  if (!existingProject) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  const itemName = payload.itemName.trim();
  if (requiresCommercialDetails(payload.stage) && payload.valueAed <= 0) {
    res.status(400).json({ message: "Project value is required for Tender stage and later." });
    return;
  }
  if (requiresCommercialDetails(payload.stage) && !itemName) {
    res.status(400).json({ message: "Item name is required for Tender stage and later." });
    return;
  }
  if (requiresCommercialDetails(payload.stage) && payload.itemQuantity <= 0) {
    res.status(400).json({ message: "Item quantity is required for Tender stage and later." });
    return;
  }

  const assignmentError = await assertProjectAssignmentAllowed(req.user, payload);
  if (assignmentError) {
    res.status(403).json({ message: assignmentError });
    return;
  }

  const assignees = await resolveProjectAssignees(payload);
  const assigneesUnchangedFromExisting =
    (payload.regionalManagerId ?? null) === existingProject.regionalManagerId &&
    (payload.managerId ?? null) === existingProject.managerId &&
    payload.salesRepIds.length === existingProject.salesRepIds.length &&
    payload.salesRepIds.every((id) => existingProject.salesRepIds.includes(id));

  if ("error" in assignees && !assigneesUnchangedFromExisting) {
    res.status(400).json({ message: assignees.error });
    return;
  }
  const resolvedRegionalManagerId =
    "error" in assignees ? existingProject.regionalManagerId : assignees.regionalManagerId;
  const resolvedRegionalManagerName =
    "error" in assignees ? existingProject.regionalManagerName : assignees.regionalManagerName;
  const resolvedManagerId = "error" in assignees ? existingProject.managerId : assignees.managerId;
  const resolvedManagerName = "error" in assignees ? existingProject.managerName : assignees.managerName;
  const resolvedSalesRepIds = "error" in assignees ? existingProject.salesRepIds : assignees.salesRepIds;
  const resolvedSalesRepNames =
    "error" in assignees ? existingProject.salesRepNames : assignees.salesRepNames;
  const resolvedOwner =
    resolvedSalesRepNames[0] ?? resolvedManagerName ?? resolvedRegionalManagerName ?? existingProject.owner;

  const project = await updateProject(req.params.projectId as string, {
    ...payload,
    businessDivision: payload.businessDivision ?? null,
    itemName,
    regionalManagerId: resolvedRegionalManagerId,
    regionalManagerName: resolvedRegionalManagerName,
    managerId: resolvedManagerId,
    owner: resolvedOwner,
    managerName: resolvedManagerName,
    salesRepIds: resolvedSalesRepIds,
    salesRepNames: resolvedSalesRepNames
  });

  res.status(200).json({ project });
});

apiRouter.delete("/projects/:projectId", authenticate, async (req, res) => {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    res.status(403).json({ message: "Only admins can delete projects" });
    return;
  }

  const deleted = await deleteProject(req.params.projectId as string);
  if (!deleted) {
    res.status(404).json({ message: "Project not found" });
    return;
  }

  res.status(204).send();
});

apiRouter.get("/projects/:projectId/activities", authenticate, async (req, res) => {
  const activityModel = projectActivityDelegate();
  if (!activityModel) {
    res.status(503).json({ message: "Activity service is unavailable. Restart backend once." });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const items = await activityModel.findMany({
    where: { projectId: req.params.projectId as string },
    orderBy: { createdAt: "desc" },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
  res.status(200).json({
    items: items.map((item) => ({
      ...item,
      attachments: Array.isArray(item.attachments) ? item.attachments : []
    }))
  });
});

apiRouter.post("/projects/:projectId/activities", authenticate, async (req, res) => {
  const activityModel = projectActivityDelegate();
  if (!activityModel) {
    res.status(503).json({ message: "Activity service is unavailable. Restart backend once." });
    return;
  }

  const parsed = projectActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { firstName: true, lastName: true }
  });

  const createdByName = user ? `${user.firstName} ${user.lastName}`.trim() : null;

  const activity = await activityModel.create({
    data: {
      projectId: req.params.projectId as string,
      type: parsed.data.type,
      message: parsed.data.message,
      visitWhatHappened:
        parsed.data.type === "visit"
          ? (parsed.data.visitWhatHappened?.trim() || undefined)
          : undefined,
      visitLat: parsed.data.type === "visit" ? parsed.data.visitLocation?.lat : undefined,
      visitLng: parsed.data.type === "visit" ? parsed.data.visitLocation?.lng : undefined,
      visitAccuracyM:
        parsed.data.type === "visit"
          ? (parsed.data.visitLocation?.accuracyM ?? undefined)
          : undefined,
      createdById: req.user!.id,
      createdByName,
      attachments: parsed.data.attachments && parsed.data.attachments.length > 0
        ? {
            create: parsed.data.attachments.map((attachment) => ({
              kind: attachment.kind,
              name: attachment.name,
              filename: attachment.filename,
              size: attachment.size,
              mimeType: attachment.mimeType,
              url: attachment.url,
              createdById: req.user!.id,
              createdByName,
            }))
          }
        : undefined
    },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (parsed.data.followUpDueAt) {
    const followUpModel = followUpDelegate();
    if (!followUpModel) {
      res.status(503).json({ message: "Follow-up service is unavailable. Restart backend once." });
      return;
    }

    const dueAt = new Date(parsed.data.followUpDueAt);
    const now = new Date();
    const initialStatus = dueAt.getTime() < now.getTime() ? "Overdue" : "Upcoming";
    const channelMap: Record<
      "note" | "call" | "visit" | "email" | "whatsapp" | "stage",
      "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting"
    > = {
      note: "Meeting",
      call: "Call",
      visit: "Visit",
      email: "Email",
      whatsapp: "WhatsApp",
      stage: "Meeting",
    };

    const contactFromMessageMatch = parsed.data.message.match(/(?:^|\n)\s*Contact:\s*([^\n]+)/i);
    const meetingWithFromMessageMatch = parsed.data.message.match(/(?:^|\n)\s*Meeting with:\s*([^\n]+)/i);
    const resolvedContact =
      contactFromMessageMatch?.[1]?.trim() ||
      meetingWithFromMessageMatch?.[1]?.trim() ||
      null;

    if (!resolvedContact) {
      res.status(400).json({
        message: "Follow-up contact is required. Add contact details in activity before adding to follow-ups.",
      });
      return;
    }

    const createdFollowUp = await followUpModel.create({
      data: {
        projectId: req.params.projectId as string,
        sourceActivityId: activity.id as string,
        ownerId: req.user!.id,
        contact: resolvedContact,
        contactRole: "Activity Contact",
        dueAt,
        channel: channelMap[parsed.data.type],
        status: initialStatus,
        note: parsed.data.message,
      },
    });
    if (createdFollowUp && typeof (createdFollowUp as { id?: string }).id === "string") {
      void sendFollowUpNotificationById({
        followUpId: (createdFollowUp as { id: string }).id,
        action: "created",
        actorName: createdByName,
      }).catch(() => undefined);
    }
  }

  res.status(201).json({
    activity: {
      ...activity,
      attachments: Array.isArray(activity.attachments) ? activity.attachments : []
    }
  });
});

apiRouter.patch("/projects/:projectId/activities/:activityId", authenticate, async (req, res) => {
  const activityModel = projectActivityDelegate();
  if (!activityModel) {
    res.status(503).json({ message: "Activity service is unavailable. Restart backend once." });
    return;
  }

  const parsed = projectActivityUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const existing = await activityModel.findUnique({
    where: { id: req.params.activityId as string },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" }
      }
    }
  }) as { id: string; projectId: string; createdById: string | null; attachments?: unknown[] } | null;
  if (!existing) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (existing.projectId !== (req.params.projectId as string)) {
    res.status(400).json({ message: "Activity does not belong to this project" });
    return;
  }

  const canEdit = existing.createdById === req.user?.id;
  if (!canEdit) {
    res.status(403).json({ message: "You can only edit your own activity" });
    return;
  }

  const updated = await activityModel.update({
    where: { id: req.params.activityId as string },
    data: {
      type: parsed.data.type,
      message: parsed.data.message,
      visitWhatHappened:
        parsed.data.type === "visit"
          ? (parsed.data.visitWhatHappened?.trim() || null)
          : null,
    },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  res.status(200).json({
    activity: {
      ...updated,
      attachments: Array.isArray((updated as { attachments?: unknown[] }).attachments)
        ? (updated as { attachments?: unknown[] }).attachments
        : []
    }
  });
});

apiRouter.delete("/projects/:projectId/activities/:activityId", authenticate, async (req, res) => {
  const activityModel = projectActivityDelegate();
  if (!activityModel) {
    res.status(503).json({ message: "Activity service is unavailable. Restart backend once." });
    return;
  }
  const followUpModel = followUpDelegate();
  if (!followUpModel) {
    res.status(503).json({ message: "Follow-up service is unavailable. Restart backend once." });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const activity = await activityModel.findUnique({
    where: { id: req.params.activityId as string },
    select: { id: true, projectId: true, createdById: true }
  }) as { id: string; projectId: string; createdById: string | null } | null;
  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (activity.projectId !== (req.params.projectId as string)) {
    res.status(400).json({ message: "Activity does not belong to this project" });
    return;
  }

  const canDelete = activity.createdById === req.user?.id;

  if (!canDelete) {
    res.status(403).json({ message: "You can only delete your own activity" });
    return;
  }

  await followUpModel.deleteMany({
    where: { sourceActivityId: req.params.activityId as string }
  });
  await activityModel.delete({
    where: { id: req.params.activityId as string }
  });
  res.status(204).send();
});

apiRouter.get("/projects/:projectId/stakeholders", authenticate, async (req, res) => {
  const stakeholderModel = projectStakeholderDelegate();
  if (!stakeholderModel) {
    res.status(503).json({ message: "Stakeholder service is unavailable. Restart backend once." });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const items = await stakeholderModel.findMany({
    where: { projectId: req.params.projectId as string },
    orderBy: { createdAt: "desc" }
  });
  res.status(200).json({ items });
});

apiRouter.post("/projects/:projectId/stakeholders", authenticate, async (req, res) => {
  const stakeholderModel = projectStakeholderDelegate();
  if (!stakeholderModel) {
    res.status(503).json({ message: "Stakeholder service is unavailable. Restart backend once." });
    return;
  }

  const parsed = stakeholderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { firstName: true, lastName: true }
  });

  const createdByName = user ? `${user.firstName} ${user.lastName}`.trim() : null;
  const payload = parsed.data;

  const stakeholder = await stakeholderModel.create({
    data: {
      projectId: req.params.projectId as string,
      role: payload.role,
      name: payload.name,
      organization: payload.organization ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      createdById: req.user!.id,
      createdByName
    }
  });

  res.status(201).json({ stakeholder });
});

apiRouter.patch("/projects/:projectId/stakeholders/:stakeholderId", authenticate, async (req, res) => {
  const stakeholderModel = projectStakeholderDelegate();
  if (!stakeholderModel) {
    res.status(503).json({ message: "Stakeholder service is unavailable. Restart backend once." });
    return;
  }

  const parsed = stakeholderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const existing = await stakeholderModel.findUnique({
    where: { id: req.params.stakeholderId as string }
  });
  if (!existing || existing.projectId !== (req.params.projectId as string)) {
    res.status(404).json({ message: "Stakeholder not found" });
    return;
  }

  const payload = parsed.data;
  const stakeholder = await stakeholderModel.update({
    where: { id: req.params.stakeholderId as string },
    data: {
      role: payload.role,
      name: payload.name,
      organization: payload.organization ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    }
  });

  res.status(200).json({ stakeholder });
});

apiRouter.delete("/projects/:projectId/stakeholders/:stakeholderId", authenticate, async (req, res) => {
  const stakeholderModel = projectStakeholderDelegate();
  if (!stakeholderModel) {
    res.status(503).json({ message: "Stakeholder service is unavailable. Restart backend once." });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId as string },
    select: { id: true }
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, req.params.projectId as string))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const existing = await stakeholderModel.findUnique({
    where: { id: req.params.stakeholderId as string }
  });
  if (!existing || existing.projectId !== (req.params.projectId as string)) {
    res.status(404).json({ message: "Stakeholder not found" });
    return;
  }

  await stakeholderModel.delete({
    where: { id: req.params.stakeholderId as string }
  });
  res.status(204).send();
});

apiRouter.get("/follow-ups", authenticate, async (req, res) => {
  const followUpModel = followUpDelegate();
  if (!followUpModel) {
    res.status(503).json({ message: "Follow-up service is unavailable. Restart backend once." });
    return;
  }
  const projectScope = projectScopeForUser(req.user!);
  const where = projectScope ? ({ project: projectScope } satisfies Prisma.FollowUpWhereInput) : undefined;
  const followUps = await followUpModel.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  res.status(200).json({
    items: followUps.map((item) => ({
      id: item.id,
      projectId: item.projectId,
      projectName: item.project.name,
      ownerId: item.ownerId,
      ownerName: item.owner ? `${item.owner.firstName} ${item.owner.lastName}`.trim() : null,
      contact: item.contact,
      contactRole: item.contactRole,
      dueAt: item.dueAt.toISOString(),
      channel: item.channel,
      status: item.status,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
});

apiRouter.post("/follow-ups", authenticate, async (req, res) => {
  const followUpModel = followUpDelegate();
  if (!followUpModel) {
    res.status(503).json({ message: "Follow-up service is unavailable. Restart backend once." });
    return;
  }
  const parsed = followUpCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }
  const payload = parsed.data;
  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
    select: { id: true },
  });
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, payload.projectId))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const ownerId = payload.ownerId ?? req.user!.id;
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true },
  });
  if (!owner) {
    res.status(400).json({ message: "Owner user not found" });
    return;
  }

  const dueAt = new Date(payload.dueAt);
  const now = new Date();
  const initialStatus = dueAt.getTime() < now.getTime() ? "Overdue" : "Upcoming";

  const followUp = await followUpModel.create({
    data: {
      projectId: payload.projectId,
      ownerId,
      contact: payload.contact,
      contactRole: payload.contactRole,
      dueAt,
      channel: payload.channel,
      status: initialStatus,
      note: payload.note,
    },
  });
  if (followUp && typeof (followUp as { id?: string }).id === "string") {
    const actorName = req.user?.email ?? "CRM";
    void sendFollowUpNotificationById({
      followUpId: (followUp as { id: string }).id,
      action: "created",
      actorName,
    }).catch(() => undefined);
  }
  res.status(201).json({ followUp });
});

apiRouter.patch("/follow-ups/:followUpId", authenticate, async (req, res) => {
  const followUpModel = followUpDelegate();
  if (!followUpModel) {
    res.status(503).json({ message: "Follow-up service is unavailable. Restart backend once." });
    return;
  }
  const parsed = followUpUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.followUp.findUnique({
    where: { id: req.params.followUpId as string },
    select: { id: true, projectId: true },
  });
  if (!existing) {
    res.status(404).json({ message: "Follow-up not found" });
    return;
  }
  if (!(await canAccessProjectById(req.user!, existing.projectId))) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const payload = parsed.data;
  const followUp = await followUpModel.update({
    where: { id: req.params.followUpId as string },
    data: {
      dueAt: payload.dueAt ? new Date(payload.dueAt) : undefined,
      channel: payload.channel,
      status: payload.status,
      note: payload.note,
    },
  });
  if (followUp && typeof (followUp as { id?: string }).id === "string") {
    const actorName = req.user?.email ?? "CRM";
    void sendFollowUpNotificationById({
      followUpId: (followUp as { id: string }).id,
      action: "updated",
      actorName,
    }).catch(() => undefined);
  }
  res.status(200).json({ followUp });
});
