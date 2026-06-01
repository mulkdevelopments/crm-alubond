import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { toAuthUser, validateCredentials } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const bootstrapSchema = z.object({
  setupKey: z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional()
});

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const result = await validateCredentials(parsed.data.email, parsed.data.password);
  if (!result) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  res.status(200).json(result);
});

authRouter.post("/bootstrap-admin", async (req, res) => {
  const parsed = bootstrapSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  if (parsed.data.setupKey !== env.ADMIN_SETUP_KEY) {
    res.status(403).json({ message: "Invalid setup key" });
    return;
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  });

  if (existingAdmin) {
    res.status(409).json({ message: "Admin already exists" });
    return;
  }

  const email = (parsed.data.email ?? env.ADMIN_EMAIL).toLowerCase();
  const password = parsed.data.password ?? env.ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      firstName: parsed.data.firstName ?? env.ADMIN_FIRST_NAME,
      lastName: parsed.data.lastName ?? env.ADMIN_LAST_NAME,
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const loginResult = await validateCredentials(email, password);

  res.status(201).json({
    token: loginResult?.token ?? null,
    user: toAuthUser(admin)
  });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      role: true,
      managerId: true,
      firstName: true,
      lastName: true
    }
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json(user);
});

authRouter.get("/roles", authenticate, authorize(UserRole.ADMIN), (_req, res) => {
  res.status(200).json({
    roles: Object.values(UserRole)
  });
});
