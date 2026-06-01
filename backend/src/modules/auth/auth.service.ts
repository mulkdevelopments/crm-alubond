import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, UserRole } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AuthUser } from "../../types/auth";

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export async function validateCredentials(email: string, password: string): Promise<LoginResult | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user || !user.isActive) {
    return null;
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return null;
  }

  return {
    token: signToken(user),
    user: toAuthUser(user)
  };
}

export function signToken(user: Pick<User, "id" | "email" | "role" | "managerId">): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      managerId: user.managerId
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (!decoded.sub || !decoded.email || !decoded.role) {
    throw new Error("Invalid token payload");
  }

  return {
    id: String(decoded.sub),
    email: String(decoded.email),
    role: decoded.role as UserRole,
    managerId: decoded.managerId ? String(decoded.managerId) : null
  };
}

export function toAuthUser(user: Pick<User, "id" | "email" | "role" | "managerId">): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    managerId: user.managerId
  };
}
