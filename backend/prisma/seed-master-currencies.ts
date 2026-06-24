import { PrismaClient } from "@prisma/client";

import { DEFAULT_CURRENCIES, REGION_DEFAULT_CURRENCY } from "../src/lib/currency-defaults";

const prisma = new PrismaClient();

async function main() {
  for (const currency of DEFAULT_CURRENCIES) {
    await prisma.masterCurrency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        sortOrder: currency.sortOrder,
        isActive: true,
      },
      create: {
        code: currency.code,
        name: currency.name,
        rateToAed: currency.rateToAed,
        sortOrder: currency.sortOrder,
        isActive: true,
      },
    });
  }

  for (const [regionName, currencyCode] of Object.entries(REGION_DEFAULT_CURRENCY)) {
    await prisma.masterRegion.updateMany({
      where: { name: regionName },
      data: { defaultCurrencyCode: currencyCode },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${DEFAULT_CURRENCIES.length} master currencies and region defaults`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Master currency seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
