import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { notDeletedWhere } from "../projects/projects.repository";

export const customersRouter = Router();

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function canManageCustomers(role: UserRole) {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.CEO ||
    role === UserRole.MANAGER ||
    role === UserRole.REGIONAL_MANAGER ||
    role === UserRole.SALES_REP
  );
}

/** Batch project counts keyed by lowercased developer name. */
async function projectCountsByNameKey(): Promise<Map<string, number>> {
  const groups = await prisma.project.groupBy({
    by: ["developer"],
    where: notDeletedWhere,
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const group of groups) {
    const key = normalizeKey(group.developer);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + group._count._all);
  }
  return map;
}

customersRouter.get("/", authenticate, async (_req, res) => {
  const rows = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  res.status(200).json({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      projectCount: 0,
      deletedAt: null as string | null,
      deletedByName: null as string | null,
    })),
  });
});

customersRouter.get("/trash", authenticate, async (_req, res) => {
  const [rows, counts] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
    projectCountsByNameKey(),
  ]);

  res.status(200).json({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      projectCount: counts.get(normalizeKey(row.name)) ?? 0,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      deletedByName: row.deletedByName,
    })),
  });
});

customersRouter.post("/", authenticate, async (req, res) => {
  if (!req.user || !canManageCustomers(req.user.role)) {
    res.status(403).json({ message: "You do not have permission to add customers" });
    return;
  }

  const parsed = z.object({ name: z.string().trim().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const name = parsed.data.name.trim();
  const nameKey = normalizeKey(name);
  const existing = await prisma.customer.findUnique({ where: { nameKey } });
  if (existing && !existing.deletedAt) {
    res.status(409).json({ message: `Customer “${existing.name}” already exists.` });
    return;
  }
  if (existing?.deletedAt) {
    res.status(409).json({
      message: `Customer “${existing.name}” is in trash. Restore it instead of creating a duplicate.`,
    });
    return;
  }

  const customer = await prisma.customer.create({
    data: { name, nameKey },
  });

  res.status(201).json({
    customer: {
      id: customer.id,
      name: customer.name,
      projectCount: 0,
      deletedAt: null,
      deletedByName: null,
    },
  });
});

customersRouter.patch("/rename", authenticate, async (req, res) => {
  if (!req.user || !canManageCustomers(req.user.role)) {
    res.status(403).json({ message: "You do not have permission to rename customers" });
    return;
  }

  const parsed = z
    .object({
      from: z.string().trim().min(1).max(200),
      to: z.string().trim().min(1).max(200),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const from = parsed.data.from.trim();
  const to = parsed.data.to.trim();
  const fromKey = normalizeKey(from);
  const toKey = normalizeKey(to);

  if (fromKey === toKey) {
    res.status(400).json({ message: "New name must be different." });
    return;
  }

  const source = await prisma.customer.findFirst({
    where: { nameKey: fromKey, deletedAt: null },
  });
  if (!source) {
    res.status(404).json({ message: "Customer not found" });
    return;
  }

  const conflict = await prisma.customer.findFirst({
    where: { nameKey: toKey },
  });
  if (conflict) {
    res.status(409).json({
      message: conflict.deletedAt
        ? `Customer “${conflict.name}” is in trash. Restore or permanently delete it first.`
        : `Customer “${conflict.name}” already exists.`,
    });
    return;
  }

  const [, projectResult] = await prisma.$transaction([
    prisma.customer.update({
      where: { id: source.id },
      data: { name: to, nameKey: toKey },
    }),
    prisma.project.updateMany({
      where: {
        ...notDeletedWhere,
        developer: { equals: from, mode: "insensitive" },
      },
      data: { developer: to },
    }),
  ]);

  res.status(200).json({
    from,
    to,
    updatedCount: projectResult.count,
  });
});

customersRouter.post("/trash", authenticate, async (req, res) => {
  if (!req.user || !canManageCustomers(req.user.role)) {
    res.status(403).json({ message: "You do not have permission to move customers to trash" });
    return;
  }

  const parsed = z.object({ name: z.string().trim().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const name = parsed.data.name.trim();
  const nameKey = normalizeKey(name);

  const customer = await prisma.customer.findFirst({
    where: { nameKey, deletedAt: null },
  });
  if (!customer) {
    res.status(404).json({ message: "Customer not found" });
    return;
  }

  const actor = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { firstName: true, lastName: true },
  });
  const deletedByName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : req.user.email;

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      deletedAt: new Date(),
      deletedById: req.user.id,
      deletedByName: deletedByName || "User",
    },
  });

  const counts = await projectCountsByNameKey();

  res.status(200).json({
    customer: {
      id: updated.id,
      name: updated.name,
      projectCount: counts.get(normalizeKey(updated.name)) ?? 0,
      deletedAt: updated.deletedAt?.toISOString() ?? null,
      deletedByName: updated.deletedByName,
    },
  });
});

customersRouter.post("/:customerId/restore", authenticate, async (req, res) => {
  if (!req.user || !canManageCustomers(req.user.role)) {
    res.status(403).json({ message: "You do not have permission to restore customers" });
    return;
  }

  const customerId = String(req.params.customerId);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: { not: null } },
  });
  if (!customer) {
    res.status(404).json({ message: "Trashed customer not found" });
    return;
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      deletedAt: null,
      deletedById: null,
      deletedByName: null,
    },
  });

  res.status(200).json({
    customer: {
      id: updated.id,
      name: updated.name,
      projectCount: 0,
      deletedAt: null,
      deletedByName: null,
    },
  });
});

customersRouter.delete("/:customerId/permanent", authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const customerId = String(req.params.customerId);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: { not: null } },
  });
  if (!customer) {
    res.status(404).json({ message: "Trashed customer not found" });
    return;
  }

  // Clear matching project customer fields so this name isn't left orphaned on projects.
  await prisma.project.updateMany({
    where: {
      developer: { equals: customer.name, mode: "insensitive" },
    },
    data: { developer: "" },
  });

  await prisma.customer.delete({ where: { id: customer.id } });
  res.status(204).send();
});
