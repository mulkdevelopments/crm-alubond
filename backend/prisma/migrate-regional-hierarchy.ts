import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureRegionalManagers() {
  const passwordHash = await bcrypt.hash("Regional@12345", 10);

  const south = await prisma.user.upsert({
    where: { email: "regional.south@alubondcrm.local" },
    update: {
      firstName: "Anita",
      lastName: "Menon",
      role: UserRole.REGIONAL_MANAGER,
      operationLocations: ["South India"],
      regions: ["South India", "Sri Lanka"],
      passwordHash,
      isActive: true,
    },
    create: {
      email: "regional.south@alubondcrm.local",
      firstName: "Anita",
      lastName: "Menon",
      role: UserRole.REGIONAL_MANAGER,
      operationLocations: ["South India"],
      regions: ["South India", "Sri Lanka"],
      passwordHash,
      isActive: true,
    },
  });

  const gcc = await prisma.user.upsert({
    where: { email: "regional.gcc@alubondcrm.local" },
    update: {
      firstName: "Faisal",
      lastName: "Khan",
      role: UserRole.REGIONAL_MANAGER,
      operationLocations: ["GCC"],
      regions: ["UAE", "KSA", "Qatar"],
      passwordHash,
      isActive: true,
    },
    create: {
      email: "regional.gcc@alubondcrm.local",
      firstName: "Faisal",
      lastName: "Khan",
      role: UserRole.REGIONAL_MANAGER,
      operationLocations: ["GCC"],
      regions: ["UAE", "KSA", "Qatar"],
      passwordHash,
      isActive: true,
    },
  });

  return { south, gcc };
}

async function assignManagersToRegionalManagers(regionalManagers: { south: { id: string }, gcc: { id: string } }) {
  const managers = await prisma.user.findMany({
    where: { role: UserRole.MANAGER },
    select: { id: true, operationLocations: true, regionalManagerId: true },
  });

  let updated = 0;
  for (const manager of managers) {
    const managerProjects = await prisma.project.findMany({
      where: { managerId: manager.id },
      select: { country: true },
      take: 20,
    });

    const scopeText = `${manager.operationLocations.join(" ")} ${managerProjects.map((p) => p.country).join(" ")}`.toLowerCase();
    const looksSouthIndia =
      scopeText.includes("india") ||
      scopeText.includes("kerala") ||
      scopeText.includes("tamil") ||
      scopeText.includes("south");

    const regionalManagerId = looksSouthIndia ? regionalManagers.south.id : regionalManagers.gcc.id;

    if (manager.regionalManagerId !== regionalManagerId) {
      await prisma.user.update({
        where: { id: manager.id },
        data: { regionalManagerId },
      });
      updated += 1;
    }
  }

  return updated;
}

async function main() {
  const regionalManagers = await ensureRegionalManagers();
  const updatedManagers = await assignManagersToRegionalManagers(regionalManagers);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      regionalManagers: [regionalManagers.south.id, regionalManagers.gcc.id].length,
      updatedManagers,
    })
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Regional hierarchy migration failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

