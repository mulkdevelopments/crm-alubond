import { AccessRequest, AccessRequestStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";

const statusFilterSchema = z.enum(["PENDING", "DISMISSED", "ALL"]).optional().default("PENDING");

const updateAccessRequestSchema = z.object({
  status: z.enum(["DISMISSED", "PENDING"]),
});

function serializeAccessRequest(item: AccessRequest) {
  return {
    id: item.id,
    firstName: item.firstName,
    lastName: item.lastName,
    email: item.email,
    message: item.message,
    status: item.status,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    reviewedById: item.reviewedById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export const accessRequestsRouter = Router();

accessRequestsRouter.use(authenticate, authorize(UserRole.ADMIN));

accessRequestsRouter.get("/", async (req, res) => {
  const parsed = statusFilterSchema.safeParse(req.query.status);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid status filter" });
    return;
  }

  const where =
    parsed.data === "ALL"
      ? undefined
      : { status: parsed.data as AccessRequestStatus };

  const items = await prisma.accessRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  res.status(200).json({
    items: items.map(serializeAccessRequest),
  });
});

accessRequestsRouter.get("/pending-count", async (_req, res) => {
  const count = await prisma.accessRequest.count({
    where: { status: AccessRequestStatus.PENDING },
  });
  res.status(200).json({ count });
});

accessRequestsRouter.patch("/:requestId", async (req, res) => {
  const parsed = updateAccessRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.accessRequest.findUnique({
    where: { id: req.params.requestId as string },
  });
  if (!existing) {
    res.status(404).json({ message: "Access request not found" });
    return;
  }

  const updated = await prisma.accessRequest.update({
    where: { id: existing.id },
    data:
      parsed.data.status === AccessRequestStatus.DISMISSED
        ? {
            status: AccessRequestStatus.DISMISSED,
            reviewedAt: new Date(),
            reviewedById: req.user!.id,
          }
        : {
            status: AccessRequestStatus.PENDING,
            reviewedAt: null,
            reviewedById: null,
          },
  });

  res.status(200).json({ item: serializeAccessRequest(updated) });
});

accessRequestsRouter.delete("/:requestId", async (req, res) => {
  const existing = await prisma.accessRequest.findUnique({
    where: { id: req.params.requestId as string },
  });
  if (!existing) {
    res.status(404).json({ message: "Access request not found" });
    return;
  }

  await prisma.accessRequest.delete({ where: { id: existing.id } });
  res.status(204).send();
});
