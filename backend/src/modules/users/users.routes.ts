import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { toAuthUser } from "../auth/auth.service";

const entityIdSchema = z.string().min(3).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const optionalEntityIdSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  entityIdSchema.nullable().optional()
);

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  managerId: optionalEntityIdSchema,
  regionalManagerId: optionalEntityIdSchema,
  reportsToId: optionalEntityIdSchema,
  regions: z.array(z.string().min(1)).optional().default([]),
  operationLocation: z.string().min(1),
  yearlyTarget: z.number().positive().optional().nullable(),
  canSetBusinessDivision: z.boolean().optional().default(false)
});

const updateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  managerId: optionalEntityIdSchema,
  regionalManagerId: optionalEntityIdSchema,
  reportsToId: optionalEntityIdSchema,
  regions: z.array(z.string().min(1)).optional().default([]),
  operationLocation: z.string().min(1),
  yearlyTarget: z.number().positive().optional().nullable(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
  canSetBusinessDivision: z.boolean().optional()
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const locationPingSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracyM: z.number().positive().max(10000).optional().nullable(),
  recordedAt: z.string().datetime().optional()
});

const attendanceMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional()
});

const routeDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional()
});

export const usersRouter = Router();

usersRouter.use(authenticate);

function localBoundaryToUtc(year: number, monthIndex: number, day: number, tzOffsetMinutes: number) {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0) + tzOffsetMinutes * 60_000);
}

function userLocationPingDelegate(): {
  create: (args: {
    data: {
      userId: string;
      lat: number;
      lng: number;
      accuracyM: number | null;
      recordedAt: Date;
    };
  }) => Promise<unknown>;
  findMany: (args: {
    where: {
      userId: string;
      recordedAt?: {
        gte?: Date;
        lte?: Date;
        lt?: Date;
      };
    };
    orderBy: { recordedAt: "asc" };
    select?: { recordedAt: true };
  }) => Promise<Array<{ recordedAt: Date; id?: string; lat?: number; lng?: number; accuracyM?: number | null }>>;
} | null {
  const delegate = (prisma as unknown as { userLocationPing?: unknown }).userLocationPing;
  if (!delegate || typeof delegate !== "object") {
    return null;
  }
  const candidate = delegate as {
    create?: (args: {
      data: {
        userId: string;
        lat: number;
        lng: number;
        accuracyM: number | null;
        recordedAt: Date;
      };
    }) => Promise<unknown>;
    findMany?: (args: {
      where: {
        userId: string;
        recordedAt?: {
          gte?: Date;
          lte?: Date;
          lt?: Date;
        };
      };
      orderBy: { recordedAt: "asc" };
      select?: { recordedAt: true };
    }) => Promise<Array<{ recordedAt: Date; id?: string; lat?: number; lng?: number; accuracyM?: number | null }>>;
  };
  if (!candidate.create || !candidate.findMany) {
    return null;
  }
  return {
    create: candidate.create,
    findMany: candidate.findMany
  };
}

async function canAccessUser(requesterId: string, requesterRole: UserRole, targetUserId: string): Promise<boolean> {
  if (requesterRole === UserRole.ADMIN || requesterRole === UserRole.CEO) return true;
  if (requesterId === targetUserId) return true;
  if (requesterRole === UserRole.REGIONAL_MANAGER) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, regionalManagerId: true, manager: { select: { regionalManagerId: true } } }
    });
    if (!target) return false;
    if (target.role === UserRole.MANAGER) return target.regionalManagerId === requesterId;
    if (target.role === UserRole.SALES_REP) {
      return target.regionalManagerId === requesterId || target.manager?.regionalManagerId === requesterId;
    }
    return false;
  }
  if (requesterRole === UserRole.MANAGER) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { managerId: true }
    });
    return target?.managerId === requesterId;
  }
  return false;
}

usersRouter.post("/", authorize(UserRole.ADMIN), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const email = payload.email.toLowerCase();

  if (payload.role === UserRole.SALES_REP && !payload.managerId && !payload.regionalManagerId) {
    res.status(400).json({ message: "Sales rep must be assigned under a manager or regional manager" });
    return;
  }
  if (payload.role === UserRole.MANAGER && !payload.regionalManagerId) {
    res.status(400).json({ message: "Manager must be assigned under a regional manager" });
    return;
  }
  if (payload.role === UserRole.REGIONAL_MANAGER && payload.regions.length === 0) {
    res.status(400).json({ message: "Regional manager must have at least one region" });
    return;
  }
  if (payload.role === UserRole.REGIONAL_MANAGER && !payload.reportsToId) {
    res.status(400).json({ message: "Regional manager must be assigned under CEO" });
    return;
  }
  if (payload.role !== UserRole.ADMIN && !payload.yearlyTarget) {
    res.status(400).json({ message: "Yearly sales target is required for all non-admin users" });
    return;
  }

  let resolvedRegionalManagerIdForSalesRep: string | null = payload.regionalManagerId ?? null;

  if (payload.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: payload.managerId },
      select: { id: true, role: true, regionalManagerId: true }
    });

    if (!manager || manager.role !== UserRole.MANAGER) {
      res.status(400).json({ message: "managerId must belong to a manager user" });
      return;
    }

    if (payload.role === UserRole.SALES_REP) {
      if (resolvedRegionalManagerIdForSalesRep && manager.regionalManagerId !== resolvedRegionalManagerIdForSalesRep) {
        res.status(400).json({ message: "managerId and regionalManagerId do not belong to the same hierarchy" });
        return;
      }
      resolvedRegionalManagerIdForSalesRep = manager.regionalManagerId ?? resolvedRegionalManagerIdForSalesRep;
    }
  }
  if (payload.regionalManagerId) {
    const regionalManager = await prisma.user.findUnique({
      where: { id: payload.regionalManagerId }
    });

    if (!regionalManager || regionalManager.role !== UserRole.REGIONAL_MANAGER) {
      res.status(400).json({ message: "regionalManagerId must belong to a regional manager user" });
      return;
    }
  }
  if (payload.reportsToId) {
    const ceo = await prisma.user.findUnique({
      where: { id: payload.reportsToId },
      select: { id: true, role: true }
    });

    if (!ceo || ceo.role !== UserRole.CEO) {
      res.status(400).json({ message: "reportsToId must belong to a CEO user" });
      return;
    }
  }

  const duplicate = await prisma.user.findUnique({ where: { email } });
  if (duplicate) {
    res.status(409).json({ message: "Email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      passwordHash,
      role: payload.role,
      managerId: payload.role === UserRole.SALES_REP ? payload.managerId ?? null : null,
      regionalManagerId:
        payload.role === UserRole.MANAGER
          ? payload.regionalManagerId ?? null
          : payload.role === UserRole.SALES_REP
            ? resolvedRegionalManagerIdForSalesRep
            : null,
      reportsToId: payload.role === UserRole.REGIONAL_MANAGER ? payload.reportsToId ?? null : null,
      regions: payload.role === UserRole.REGIONAL_MANAGER ? payload.regions : [],
      operationLocation: payload.operationLocation,
      yearlyTarget: payload.role !== UserRole.ADMIN ? payload.yearlyTarget ?? null : null,
      canSetBusinessDivision:
        payload.role === UserRole.REGIONAL_MANAGER ? payload.canSetBusinessDivision ?? false : false
    }
  });

  res.status(201).json({
    user: toAuthUser(user)
  });
});

usersRouter.patch("/:userId", authorize(UserRole.ADMIN), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const email = payload.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { id: req.params.userId as string },
    select: { id: true, email: true, role: true, passwordHash: true }
  });
  if (!existing) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (payload.role === UserRole.SALES_REP && !payload.managerId && !payload.regionalManagerId) {
    res.status(400).json({ message: "Sales rep must be assigned under a manager or regional manager" });
    return;
  }
  if (payload.role === UserRole.MANAGER && !payload.regionalManagerId) {
    res.status(400).json({ message: "Manager must be assigned under a regional manager" });
    return;
  }
  if (payload.role === UserRole.REGIONAL_MANAGER && payload.regions.length === 0) {
    res.status(400).json({ message: "Regional manager must have at least one region" });
    return;
  }
  if (payload.role === UserRole.REGIONAL_MANAGER && !payload.reportsToId) {
    res.status(400).json({ message: "Regional manager must be assigned under CEO" });
    return;
  }
  if (payload.role !== UserRole.ADMIN && !payload.yearlyTarget) {
    res.status(400).json({ message: "Yearly sales target is required for all non-admin users" });
    return;
  }

  let resolvedRegionalManagerIdForSalesRep: string | null = payload.regionalManagerId ?? null;

  if (payload.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: payload.managerId },
      select: { id: true, role: true, regionalManagerId: true }
    });

    if (!manager || manager.role !== UserRole.MANAGER) {
      res.status(400).json({ message: "managerId must belong to a manager user" });
      return;
    }

    if (payload.role === UserRole.SALES_REP) {
      if (resolvedRegionalManagerIdForSalesRep && manager.regionalManagerId !== resolvedRegionalManagerIdForSalesRep) {
        res.status(400).json({ message: "managerId and regionalManagerId do not belong to the same hierarchy" });
        return;
      }
      resolvedRegionalManagerIdForSalesRep = manager.regionalManagerId ?? resolvedRegionalManagerIdForSalesRep;
    }
  }
  if (payload.regionalManagerId) {
    const regionalManager = await prisma.user.findUnique({
      where: { id: payload.regionalManagerId },
      select: { id: true, role: true }
    });

    if (!regionalManager || regionalManager.role !== UserRole.REGIONAL_MANAGER) {
      res.status(400).json({ message: "regionalManagerId must belong to a regional manager user" });
      return;
    }
  }
  if (payload.reportsToId) {
    const ceo = await prisma.user.findUnique({
      where: { id: payload.reportsToId },
      select: { id: true, role: true }
    });

    if (!ceo || ceo.role !== UserRole.CEO) {
      res.status(400).json({ message: "reportsToId must belong to a CEO user" });
      return;
    }
  }

  const duplicate = await prisma.user.findUnique({ where: { email } });
  if (duplicate && duplicate.id !== existing.id) {
    res.status(409).json({ message: "Email already exists" });
    return;
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : existing.passwordHash;
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      managerId: payload.role === UserRole.SALES_REP ? payload.managerId ?? null : null,
      regionalManagerId:
        payload.role === UserRole.MANAGER
          ? payload.regionalManagerId ?? null
          : payload.role === UserRole.SALES_REP
            ? resolvedRegionalManagerIdForSalesRep
            : null,
      reportsToId: payload.role === UserRole.REGIONAL_MANAGER ? payload.reportsToId ?? null : null,
      regions: payload.role === UserRole.REGIONAL_MANAGER ? payload.regions : [],
      operationLocation: payload.operationLocation,
      yearlyTarget: payload.role !== UserRole.ADMIN ? payload.yearlyTarget ?? null : null,
      passwordHash,
      isActive: payload.isActive ?? undefined,
      canSetBusinessDivision:
        payload.role === UserRole.REGIONAL_MANAGER ? payload.canSetBusinessDivision ?? false : false
    }
  });

  res.status(200).json({ user: toAuthUser(user) });
});

usersRouter.get("/", async (req, res) => {
  let where: Prisma.UserWhereInput = { id: req.user!.id };

  if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.CEO) {
    where = {};
  } else if (req.user!.role === UserRole.REGIONAL_MANAGER) {
    where = {
      OR: [
        { id: req.user!.id },
        { regionalManagerId: req.user!.id },
        { manager: { regionalManagerId: req.user!.id } },
      ],
    };
  } else if (req.user!.role === UserRole.MANAGER) {
    const manager = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { regionalManagerId: true },
    });
    if (manager?.regionalManagerId) {
      where = {
        OR: [
          { id: req.user!.id },
          { id: manager.regionalManagerId },
          { regionalManagerId: manager.regionalManagerId },
          { manager: { regionalManagerId: manager.regionalManagerId } },
        ],
      };
    } else {
      where = {
        OR: [{ id: req.user!.id }, { managerId: req.user!.id }],
      };
    }
  } else if (req.user!.role === UserRole.SALES_REP) {
    const rep = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        managerId: true,
        regionalManagerId: true,
        manager: {
          select: { regionalManagerId: true },
        },
      },
    });
    const managerId = rep?.managerId ?? null;
    const regionalManagerId = rep?.regionalManagerId ?? rep?.manager?.regionalManagerId ?? null;
    if (regionalManagerId) {
      where = {
        OR: [
          { id: req.user!.id },
          { id: managerId ?? undefined },
          { id: regionalManagerId },
          { regionalManagerId },
          { manager: { regionalManagerId } },
        ],
      };
    } else if (managerId) {
      where = {
        OR: [{ id: req.user!.id }, { id: managerId }, { managerId }],
      };
    }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      managerId: true,
      regionalManagerId: true,
      reportsToId: true,
      regions: true,
      operationLocation: true,
      yearlyTarget: true,
      isActive: true,
      canSetBusinessDivision: true,
      createdAt: true,
      locationPings: {
        select: { recordedAt: true },
        orderBy: { recordedAt: "desc" },
        take: 1
      },
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      regionalManager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      reportsTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const items = users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    managerId: user.managerId,
    regionalManagerId: user.regionalManagerId,
    reportsToId: user.reportsToId,
    regions: user.regions,
    operationLocation: user.operationLocation,
    yearlyTarget: user.yearlyTarget,
    isActive: user.isActive,
    canSetBusinessDivision: user.canSetBusinessDivision,
    createdAt: user.createdAt,
    manager: user.manager,
    regionalManager: user.regionalManager,
    reportsTo: user.reportsTo,
    lastLocationPingAt: user.locationPings[0]?.recordedAt ?? null
  }));

  res.status(200).json({ items });
});

usersRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      managerId: true,
      regionalManagerId: true,
      regions: true,
      canSetBusinessDivision: true,
      createdAt: true
    }
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json(user);
});

usersRouter.get("/me/location-latest", async (req, res) => {
  const ping = await prisma.userLocationPing.findFirst({
    where: { userId: req.user!.id },
    orderBy: { recordedAt: "desc" },
    select: {
      lat: true,
      lng: true,
      accuracyM: true,
      recordedAt: true,
    },
  });

  res.status(200).json({
    ping: ping
      ? {
          lat: ping.lat,
          lng: ping.lng,
          accuracyM: ping.accuracyM,
          recordedAt: ping.recordedAt.toISOString(),
        }
      : null,
  });
});

usersRouter.patch("/me", async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      managerId: true,
      regionalManagerId: true,
      regions: true
    }
  });

  res.status(200).json(user);
});

usersRouter.patch("/me/password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, passwordHash: true }
  });

  if (!existing) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const currentPasswordOk = await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash);
  if (!currentPasswordOk) {
    res.status(400).json({ message: "Current password is incorrect" });
    return;
  }

  const nextEqualsCurrent = await bcrypt.compare(parsed.data.newPassword, existing.passwordHash);
  if (nextEqualsCurrent) {
    res.status(400).json({ message: "New password must be different from current password" });
    return;
  }

  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: newPasswordHash }
  });

  res.status(200).json({ message: "Password updated successfully" });
});

usersRouter.get("/my-team", authorize(UserRole.MANAGER, UserRole.REGIONAL_MANAGER, UserRole.ADMIN, UserRole.SALES_REP), async (req, res) => {
  if (req.user!.role === UserRole.SALES_REP) {
    const rep = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            managerId: true,
          },
        },
      },
    });

    if (!rep) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const items = [
      {
        id: rep.id,
        firstName: rep.firstName,
        lastName: rep.lastName,
        email: rep.email,
        role: rep.role,
        managerId: rep.managerId,
      },
    ];

    if (rep.manager) {
      items.unshift({
        id: rep.manager.id,
        firstName: rep.manager.firstName,
        lastName: rep.manager.lastName,
        email: rep.manager.email,
        role: rep.manager.role,
        managerId: rep.manager.managerId,
      });
    }

    res.status(200).json({
      managerScope: req.user!.role,
      items,
    });
    return;
  }

  const where =
    req.user!.role === UserRole.ADMIN
      ? { role: UserRole.SALES_REP }
      : req.user!.role === UserRole.REGIONAL_MANAGER
        ? {
            role: UserRole.SALES_REP,
            OR: [{ regionalManagerId: req.user!.id }, { manager: { regionalManagerId: req.user!.id } }]
          }
        : { role: UserRole.SALES_REP, managerId: req.user!.id };

  const reps = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      managerId: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    managerScope: req.user!.role,
    items: reps
  });
});

usersRouter.get("/managers", authorize(UserRole.ADMIN, UserRole.CEO), async (_req, res) => {
  const managers = await prisma.user.findMany({
    where: { role: UserRole.MANAGER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    },
    orderBy: { firstName: "asc" }
  });

  res.status(200).json({ items: managers });
});

usersRouter.get("/ceos", authorize(UserRole.ADMIN, UserRole.CEO), async (_req, res) => {
  const ceos = await prisma.user.findMany({
    where: { role: UserRole.CEO },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    },
    orderBy: { firstName: "asc" }
  });

  res.status(200).json({ items: ceos });
});

usersRouter.get("/regional-managers", authorize(UserRole.ADMIN, UserRole.CEO), async (_req, res) => {
  const regionalManagers = await prisma.user.findMany({
    where: { role: UserRole.REGIONAL_MANAGER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    },
    orderBy: { firstName: "asc" }
  });

  res.status(200).json({ items: regionalManagers });
});

usersRouter.post("/location-pings", async (req, res) => {
  const locationModel = userLocationPingDelegate();
  if (!locationModel) {
    res.status(503).json({ message: "Location service is unavailable. Restart backend once." });
    return;
  }

  const parsed = locationPingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const recordedAt = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
  const ping = await locationModel.create({
    data: {
      userId: req.user!.id,
      lat: payload.lat,
      lng: payload.lng,
      accuracyM: payload.accuracyM ?? null,
      recordedAt
    }
  });
  res.status(201).json({ ping });
});

usersRouter.get("/:userId/location-attendance", authorize(UserRole.ADMIN, UserRole.REGIONAL_MANAGER, UserRole.MANAGER, UserRole.CEO), async (req, res) => {
  const locationModel = userLocationPingDelegate();
  if (!locationModel) {
    res.status(503).json({ message: "Location service is unavailable. Restart backend once." });
    return;
  }

  const userId = req.params.userId as string;
  const access = await canAccessUser(req.user!.id, req.user!.role, userId);
  if (!access) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const parsed = attendanceMonthSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    return;
  }

  const [yearPart, monthPart] = parsed.data.month.split("-").map(Number);
  const year = yearPart ?? NaN;
  const month = monthPart ?? NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    return;
  }
  const tzOffsetMinutes = parsed.data.tzOffsetMinutes ?? 0;
  const start = localBoundaryToUtc(year, month - 1, 1, tzOffsetMinutes);
  const end = localBoundaryToUtc(year, month, 1, tzOffsetMinutes);

  const pings = await locationModel.findMany({
    where: {
      userId,
      recordedAt: {
        gte: start,
        lt: end
      }
    },
    orderBy: { recordedAt: "asc" },
    select: { recordedAt: true }
  });

  const bucket = new Map<string, Date[]>();
  for (const ping of pings) {
    const localRecordedAt = new Date(ping.recordedAt.getTime() - tzOffsetMinutes * 60_000);
    const key = localRecordedAt.toISOString().slice(0, 10);
    const list = bucket.get(key) ?? [];
    list.push(ping.recordedAt);
    bucket.set(key, list);
  }

  const days = Array.from(bucket.entries()).map(([date, times]) => {
    const sorted = times.slice().sort((a, b) => a.getTime() - b.getTime());
    let activeMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i].getTime() - sorted[i - 1].getTime();
      activeMs += Math.min(Math.max(diff, 0), 5 * 60_000);
    }
    return {
      date,
      pingsCount: sorted.length,
      activeMinutes: Math.round(activeMs / 60_000)
    };
  }).sort((a, b) => (a.date < b.date ? -1 : 1));

  res.status(200).json({ month: parsed.data.month, days });
});

usersRouter.get("/:userId/location-route", authorize(UserRole.ADMIN, UserRole.REGIONAL_MANAGER, UserRole.MANAGER, UserRole.CEO), async (req, res) => {
  const locationModel = userLocationPingDelegate();
  if (!locationModel) {
    res.status(503).json({ message: "Location service is unavailable. Restart backend once." });
    return;
  }

  const userId = req.params.userId as string;
  const access = await canAccessUser(req.user!.id, req.user!.role, userId);
  if (!access) {
    res.status(403).json({ message: "Forbidden for your role" });
    return;
  }

  const parsed = routeDateSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    return;
  }

  const [yearPart, monthPart, dayPart] = parsed.data.date.split("-").map(Number);
  const year = yearPart ?? NaN;
  const month = monthPart ?? NaN;
  const day = dayPart ?? NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    return;
  }
  const tzOffsetMinutes = parsed.data.tzOffsetMinutes ?? 0;
  const start = localBoundaryToUtc(year, month - 1, day, tzOffsetMinutes);
  const nextDayStart = localBoundaryToUtc(year, month - 1, day + 1, tzOffsetMinutes);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });
  if (!targetUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const assignedProjectWhere =
    targetUser.role === UserRole.REGIONAL_MANAGER
      ? { manager: { regionalManagerId: targetUser.id } }
      : targetUser.role === UserRole.MANAGER
      ? { managerId: targetUser.id }
      : targetUser.role === UserRole.SALES_REP
        ? { salesRepIds: { has: targetUser.id } }
        : undefined;

  const [pings, projects] = await Promise.all([
    locationModel.findMany({
      where: {
        userId,
        recordedAt: {
          gte: start,
          lt: nextDayStart
        }
      },
      orderBy: { recordedAt: "asc" }
    }),
    prisma.project.findMany({
      where: assignedProjectWhere,
      select: { id: true, name: true, lat: true, lng: true }
    })
  ]);

  const geocodedProjects = projects.filter(
    (project): project is (typeof projects)[number] & { lat: number; lng: number } =>
      typeof project.lat === "number" && typeof project.lng === "number"
  );

  const visits = geocodedProjects
    .map((project) => {
      const nearPing = pings.find(
        (ping) =>
          typeof ping.lat === "number" &&
          typeof ping.lng === "number" &&
          haversineMeters(ping.lat, ping.lng, project.lat, project.lng) <= 500
      );
      if (!nearPing) return null;
      return {
        projectId: project.id,
        projectName: project.name,
        visitedAt: nearPing.recordedAt.toISOString()
      };
    })
    .filter(Boolean);

  res.status(200).json({
    date: parsed.data.date,
    points: pings.map((ping) => ({
      id: ping.id,
      lat: ping.lat,
      lng: ping.lng,
      accuracyM: ping.accuracyM,
      recordedAt: ping.recordedAt.toISOString()
    })),
    siteVisits: visits,
    assignedProjects: geocodedProjects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      lat: project.lat,
      lng: project.lng,
      radiusM: 500
    }))
  });
});

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
