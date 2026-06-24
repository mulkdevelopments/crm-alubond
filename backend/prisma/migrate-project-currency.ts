import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ColumnRow = { column_name: string };

async function main() {
  const columns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Project'
  `;
  const columnNames = new Set(columns.map((row) => row.column_name));

  if (!columnNames.has("valueLocal")) {
    await prisma.$executeRaw`
      ALTER TABLE "Project"
      ADD COLUMN "valueLocal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'AED',
      ADD COLUMN "fxRateToAed" DOUBLE PRECISION NOT NULL DEFAULT 1,
      ADD COLUMN "fxRateAppliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    `;
    await prisma.$executeRaw`
      UPDATE "Project"
      SET
        "valueLocal" = "valueAed",
        "currencyCode" = 'AED',
        "fxRateToAed" = 1,
        "fxRateAppliedAt" = CURRENT_TIMESTAMP
    `;
    // eslint-disable-next-line no-console
    console.log("Backfilled project currency columns from valueAed");
  } else {
    // eslint-disable-next-line no-console
    console.log("Project currency columns already exist");
  }

  const backfilled = await prisma.$executeRaw`
    UPDATE "Project"
    SET
      "valueLocal" = "valueAed",
      "currencyCode" = 'AED',
      "fxRateToAed" = 1,
      "fxRateAppliedAt" = CURRENT_TIMESTAMP
    WHERE "valueAed" > 0 AND "valueLocal" = 0
  `;
  // eslint-disable-next-line no-console
  console.log(`Backfilled legacy project values from valueAed (${String(backfilled)} row(s))`);

  const regionColumns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'MasterRegion'
  `;
  const regionColumnNames = new Set(regionColumns.map((row) => row.column_name));
  if (!regionColumnNames.has("defaultCurrencyCode")) {
    await prisma.$executeRaw`
      ALTER TABLE "MasterRegion"
      ADD COLUMN "defaultCurrencyCode" TEXT NOT NULL DEFAULT 'AED'
    `;
    // eslint-disable-next-line no-console
    console.log("Added MasterRegion.defaultCurrencyCode");
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Project currency migration failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
