import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { env } from "../../config/env";
import {
  createPasswordResetTokenValue,
  hashPasswordResetToken,
  isAuthEmailConfigured,
  sendPasswordResetEmail,
} from "../../lib/auth-mailer";
import { prisma } from "../../lib/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { toAuthUser, validateCredentials } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

const requestAccessSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email(),
  message: z.string().trim().max(1000).optional().default(""),
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

const PASSWORD_RESET_SENT_MESSAGE = "Password reset instructions have been sent to your email.";

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  if (!isAuthEmailConfigured()) {
    res.status(503).json({ message: "Password reset email is not configured. Contact your administrator." });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, isActive: true },
  });

  if (!user || !user.isActive) {
    res.status(404).json({ message: "No account exists for this email." });
    return;
  }

  const token = createPasswordResetTokenValue();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const baseUrl = env.APP_BASE_URL || env.FRONTEND_ORIGIN;
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  const appResetUrl = `alubond-crm://reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetUrl,
      appResetUrl,
    });
  } catch (error) {
    console.error("[auth] Failed to send password reset email:", error);
    res.status(500).json({ message: "Could not send reset email. Try again later." });
    return;
  }

  res.status(200).json({ message: PASSWORD_RESET_SENT_MESSAGE });
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, passwordHash: true, isActive: true } } },
  });

  if (!resetToken || !resetToken.user.isActive || resetToken.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ message: "Reset link is invalid or has expired." });
    return;
  }

  const nextEqualsCurrent = await bcrypt.compare(parsed.data.password, resetToken.user.passwordHash);
  if (nextEqualsCurrent) {
    res.status(400).json({ message: "New password must be different from your current password." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  res.status(200).json({ message: "Password updated. You can sign in now." });
});

authRouter.post("/request-access", async (req, res) => {
  const parsed = requestAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (existingUser?.isActive) {
    res.status(409).json({ message: "An account already exists for this email. Try signing in or reset your password." });
    return;
  }

  const existingRequest = await prisma.accessRequest.findFirst({
    where: { email },
    select: { id: true },
  });
  if (existingRequest) {
    res.status(409).json({ message: "Already submitted." });
    return;
  }

  await prisma.accessRequest.create({
    data: {
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      email,
      message: parsed.data.message?.trim() ?? "",
    },
  });

  res.status(200).json({
    message: "Access request submitted. An administrator will review it soon.",
  });
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
