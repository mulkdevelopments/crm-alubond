import { prisma } from "./prisma";

export type ResolvedProjectValue = {
  valueLocal: number;
  currencyCode: string;
  valueAed: number;
  fxRateToAed: number;
  fxRateAppliedAt: Date;
};

export async function getActiveCurrencyRate(code: string): Promise<{ code: string; rateToAed: number } | null> {
  const normalized = code.trim().toUpperCase();
  const row = await prisma.masterCurrency.findFirst({
    where: { code: normalized, isActive: true },
    select: { code: true, rateToAed: true },
  });
  return row;
}

export async function resolveProjectValue(params: {
  valueLocal?: number;
  currencyCode?: string;
  valueAed?: number;
}): Promise<{ ok: true; value: ResolvedProjectValue } | { ok: false; message: string }> {
  if (params.valueLocal !== undefined && params.currencyCode) {
    const currencyCode = params.currencyCode.trim().toUpperCase();
    const valueLocal = params.valueLocal;

    if (valueLocal < 0) {
      return { ok: false, message: "Project value cannot be negative." };
    }

    const rate = await getActiveCurrencyRate(currencyCode);
    if (!rate) {
      return { ok: false, message: `Currency ${currencyCode} is not available in Master Data.` };
    }

    const fxRateAppliedAt = new Date();
    return {
      ok: true,
      value: {
        valueLocal,
        currencyCode: rate.code,
        fxRateToAed: rate.rateToAed,
        fxRateAppliedAt,
        valueAed: valueLocal * rate.rateToAed,
      },
    };
  }

  const legacyValueAed = params.valueAed ?? 0;
  if (legacyValueAed < 0) {
    return { ok: false, message: "Project value cannot be negative." };
  }

  const fxRateAppliedAt = new Date();
  return {
    ok: true,
    value: {
      valueLocal: legacyValueAed,
      currencyCode: "AED",
      fxRateToAed: 1,
      fxRateAppliedAt,
      valueAed: legacyValueAed,
    },
  };
}

export async function listActiveCurrencies() {
  return prisma.masterCurrency.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { code: true, name: true, rateToAed: true },
  });
}
