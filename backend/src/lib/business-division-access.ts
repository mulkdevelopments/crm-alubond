import { UserRole } from "@prisma/client";

import { prisma } from "./prisma";

export async function userCanSetBusinessDivision(user: { id: string; role: UserRole }): Promise<boolean> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return true;
  }
  if (user.role !== UserRole.REGIONAL_MANAGER) {
    return false;
  }
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { canSetBusinessDivision: true },
  });
  return record?.canSetBusinessDivision ?? false;
}
