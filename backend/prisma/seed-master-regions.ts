import { PrismaClient } from "@prisma/client";

const DEFAULT_MASTER_REGIONS = [
  "South India",
  "Sri Lanka",
  "UAE",
  "KSA",
  "Qatar",
  "GCC",
  "Egypt",
  "Canada",
  "Vietnam",
];

const prisma = new PrismaClient();

async function main() {
  for (const [index, name] of DEFAULT_MASTER_REGIONS.entries()) {
    await prisma.masterRegion.upsert({
      where: { name },
      update: { sortOrder: index, isActive: true },
      create: { name, sortOrder: index, isActive: true },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${DEFAULT_MASTER_REGIONS.length} master regions`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Master region seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
