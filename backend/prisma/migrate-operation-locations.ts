import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ColumnRow = { column_name: string };

async function main() {
  const columns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User'
  `;
  const columnNames = new Set(columns.map((row) => row.column_name));
  const hasOld = columnNames.has("operationLocation");
  const hasNew = columnNames.has("operationLocations");

  if (hasOld && !hasNew) {
    await prisma.$executeRaw`
      ALTER TABLE "User"
      ADD COLUMN "operationLocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `;
    await prisma.$executeRaw`
      UPDATE "User"
      SET "operationLocations" = ARRAY["operationLocation"]
      WHERE "operationLocation" IS NOT NULL AND "operationLocation" <> 'Not set'
    `;
    await prisma.$executeRaw`ALTER TABLE "User" DROP COLUMN "operationLocation"`;
    // eslint-disable-next-line no-console
    console.log("Migrated operationLocation to operationLocations");
    return;
  }

  if (hasNew) {
    // eslint-disable-next-line no-console
    console.log("operationLocations column already exists");
    return;
  }

  throw new Error("Expected operationLocation or operationLocations column on User table");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Operation locations migration failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
