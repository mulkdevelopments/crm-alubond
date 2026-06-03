import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_YEARLY_TARGET_BY_ROLE: Record<Exclude<UserRole, "ADMIN">, number> = {
  SALES_REP: 18_000_000,
  MANAGER: 42_000_000,
  REGIONAL_MANAGER: 90_000_000,
  CEO: 120_000_000,
};

async function main() {
  for (const [role, yearlyTarget] of Object.entries(DEFAULT_YEARLY_TARGET_BY_ROLE) as Array<
    [Exclude<UserRole, "ADMIN">, number]
  >) {
    const updated = await prisma.user.updateMany({
      where: {
        role,
        yearlyTarget: null,
      },
      data: {
        yearlyTarget,
      },
    });
    console.log(`Backfilled ${updated.count} ${role} users with yearly target ${yearlyTarget}.`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to backfill yearly targets.", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

