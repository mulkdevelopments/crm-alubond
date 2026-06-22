import type { AuthUser } from "./auth-api";

type BusinessDivisionUser = Pick<AuthUser, "role" | "canSetBusinessDivision"> | null | undefined;

export function canSetBusinessDivision(user: BusinessDivisionUser) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "CEO") return true;
  return user.role === "REGIONAL_MANAGER" && Boolean(user.canSetBusinessDivision);
}
