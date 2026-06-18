import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

import { verifyToken } from "../modules/auth/auth.service";

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function extractAccessToken(req: Request): string | null {
  return (
    extractBearerToken(req) ??
    (typeof req.query.access_token === "string" && req.query.access_token.length > 0
      ? req.query.access_token
      : null)
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ message: "Missing bearer token" });
      return;
    }

    req.user = verifyToken(token);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

/** Allows Bearer header or `access_token` query param (needed for audio/file media tags). */
export function authenticateMediaProxy(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      res.status(401).json({ message: "Missing access token" });
      return;
    }

    req.user = verifyToken(token);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden for your role" });
      return;
    }

    next();
  };
}
