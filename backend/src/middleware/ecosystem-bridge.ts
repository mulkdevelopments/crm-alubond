import type { Request, Response, NextFunction } from "express";

const DEFAULT_KEY = "mulk-dev-bridge";

export function ecosystemBridgeAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ECOSYSTEM_BRIDGE_KEY || DEFAULT_KEY;
  const provided = req.header("X-Ecosystem-Key");
  if (provided && provided === expected) {
    next();
    return;
  }
  res.status(401).json({ message: "Unauthorized ecosystem bridge request" });
}
