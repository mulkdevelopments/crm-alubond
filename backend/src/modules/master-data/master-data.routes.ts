import { MasterCurrency, MasterRegion, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { listActiveCurrencies } from "../../lib/fx";
import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { zodValidationResponse } from "../../lib/zod-errors";

const createRegionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  defaultCurrencyCode: z.string().trim().length(3).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const updateRegionSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  defaultCurrencyCode: z.string().trim().length(3).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

const createCurrencySchema = z.object({
  code: z.string().trim().length(3),
  name: z.string().trim().min(1).max(80),
  rateToAed: z.number().positive(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const updateCurrencySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  rateToAed: z.number().positive().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

function serializeRegion(region: MasterRegion) {
  return {
    id: region.id,
    name: region.name,
    defaultCurrencyCode: region.defaultCurrencyCode,
    sortOrder: region.sortOrder,
    isActive: region.isActive,
    createdAt: region.createdAt.toISOString(),
    updatedAt: region.updatedAt.toISOString(),
  };
}

function serializeCurrency(currency: MasterCurrency) {
  return {
    id: currency.id,
    code: currency.code,
    name: currency.name,
    rateToAed: currency.rateToAed,
    sortOrder: currency.sortOrder,
    isActive: currency.isActive,
    createdAt: currency.createdAt.toISOString(),
    updatedAt: currency.updatedAt.toISOString(),
  };
}

export const masterDataRouter = Router();

masterDataRouter.use(authenticate);

masterDataRouter.get("/currencies/active", async (_req, res) => {
  const items = await listActiveCurrencies();
  res.status(200).json({ items });
});

masterDataRouter.get("/regions/active", async (_req, res) => {
  const items = await prisma.masterRegion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true, defaultCurrencyCode: true },
  });
  res.status(200).json({ items });
});

const adminMasterDataRouter = Router();
adminMasterDataRouter.use(authorize(UserRole.ADMIN));

adminMasterDataRouter.get("/regions", async (_req, res) => {
  const items = await prisma.masterRegion.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.status(200).json({ items: items.map(serializeRegion) });
});

adminMasterDataRouter.post("/regions", async (req, res) => {
  const parsed = createRegionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(zodValidationResponse(parsed.error));
    return;
  }

  const name = parsed.data.name.trim();
  const duplicate = await prisma.masterRegion.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (duplicate) {
    res.status(409).json({ message: "Region name already exists" });
    return;
  }

  const currencyCode = parsed.data.defaultCurrencyCode?.trim().toUpperCase() ?? "AED";
  const currency = await prisma.masterCurrency.findFirst({
    where: { code: currencyCode, isActive: true },
  });
  if (!currency) {
    res.status(400).json({ message: `Default currency ${currencyCode} is not active in Master Data.` });
    return;
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const maxSort = await prisma.masterRegion.aggregate({ _max: { sortOrder: true } });
    sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  }

  const created = await prisma.masterRegion.create({
    data: { name, defaultCurrencyCode: currencyCode, sortOrder },
  });

  res.status(201).json({ item: serializeRegion(created) });
});

adminMasterDataRouter.patch("/regions/:regionId", async (req, res) => {
  const parsed = updateRegionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(zodValidationResponse(parsed.error));
    return;
  }

  const existing = await prisma.masterRegion.findUnique({
    where: { id: req.params.regionId as string },
  });
  if (!existing) {
    res.status(404).json({ message: "Region not found" });
    return;
  }

  if (parsed.data.name) {
    const duplicate = await prisma.masterRegion.findFirst({
      where: {
        id: { not: existing.id },
        name: { equals: parsed.data.name.trim(), mode: "insensitive" },
      },
    });
    if (duplicate) {
      res.status(409).json({ message: "Region name already exists" });
      return;
    }
  }

  if (parsed.data.defaultCurrencyCode) {
    const currency = await prisma.masterCurrency.findFirst({
      where: { code: parsed.data.defaultCurrencyCode.trim().toUpperCase(), isActive: true },
    });
    if (!currency) {
      res.status(400).json({ message: "Default currency must be an active Master Data currency." });
      return;
    }
  }

  const updated = await prisma.masterRegion.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      defaultCurrencyCode: parsed.data.defaultCurrencyCode?.trim().toUpperCase(),
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
  });

  res.status(200).json({ item: serializeRegion(updated) });
});

adminMasterDataRouter.get("/currencies", async (_req, res) => {
  const items = await prisma.masterCurrency.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  res.status(200).json({ items: items.map(serializeCurrency) });
});

adminMasterDataRouter.post("/currencies", async (req, res) => {
  const parsed = createCurrencySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(zodValidationResponse(parsed.error));
    return;
  }

  const code = parsed.data.code.trim().toUpperCase();
  const duplicate = await prisma.masterCurrency.findUnique({ where: { code } });
  if (duplicate) {
    res.status(409).json({ message: "Currency code already exists" });
    return;
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const maxSort = await prisma.masterCurrency.aggregate({ _max: { sortOrder: true } });
    sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  }

  const created = await prisma.masterCurrency.create({
    data: {
      code,
      name: parsed.data.name.trim(),
      rateToAed: parsed.data.rateToAed,
      sortOrder,
    },
  });

  res.status(201).json({ item: serializeCurrency(created) });
});

adminMasterDataRouter.patch("/currencies/:currencyId", async (req, res) => {
  const parsed = updateCurrencySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(zodValidationResponse(parsed.error));
    return;
  }

  const existing = await prisma.masterCurrency.findUnique({
    where: { id: req.params.currencyId as string },
  });
  if (!existing) {
    res.status(404).json({ message: "Currency not found" });
    return;
  }

  const updated = await prisma.masterCurrency.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      rateToAed: parsed.data.rateToAed,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
  });

  res.status(200).json({ item: serializeCurrency(updated) });
});

masterDataRouter.use(adminMasterDataRouter);
