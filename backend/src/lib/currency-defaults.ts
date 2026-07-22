export const DEFAULT_CURRENCIES = [
  { code: "AED", name: "UAE Dirham", rateToAed: 1, sortOrder: 0 },
  { code: "SAR", name: "Saudi Riyal", rateToAed: 0.979, sortOrder: 1 },
  { code: "QAR", name: "Qatari Riyal", rateToAed: 1.01, sortOrder: 2 },
  { code: "INR", name: "Indian Rupee", rateToAed: 0.044, sortOrder: 3 },
  { code: "LKR", name: "Sri Lankan Rupee", rateToAed: 0.012, sortOrder: 4 },
  { code: "OMR", name: "Omani Rial", rateToAed: 9.54, sortOrder: 5 },
  { code: "KWD", name: "Kuwaiti Dinar", rateToAed: 11.95, sortOrder: 6 },
  { code: "BHD", name: "Bahraini Dinar", rateToAed: 9.74, sortOrder: 7 },
  { code: "USD", name: "US Dollar", rateToAed: 3.6725, sortOrder: 8 },
  { code: "EGP", name: "Egyptian Pound", rateToAed: 0.074, sortOrder: 9 },
] as const;

export const REGION_DEFAULT_CURRENCY: Record<string, string> = {
  "South India": "INR",
  "Sri Lanka": "LKR",
  UAE: "AED",
  KSA: "SAR",
  Qatar: "QAR",
  GCC: "AED",
  Egypt: "EGP",
};

export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  India: "INR",
  "Sri Lanka": "LKR",
  "United Arab Emirates": "AED",
  UAE: "AED",
  "Saudi Arabia": "SAR",
  KSA: "SAR",
  Qatar: "QAR",
  Oman: "OMR",
  Kuwait: "KWD",
  Bahrain: "BHD",
  Egypt: "EGP",
};

export function suggestCurrencyCode(params: {
  country?: string;
  operationLocations?: string[];
  regionDefaults?: Record<string, string>;
}): string {
  const country = params.country?.trim();
  if (country) {
    const fromCountry = COUNTRY_DEFAULT_CURRENCY[country];
    if (fromCountry) return fromCountry;
  }

  for (const location of params.operationLocations ?? []) {
    const fromRegion = params.regionDefaults?.[location] ?? REGION_DEFAULT_CURRENCY[location];
    if (fromRegion) return fromRegion;
  }

  return "AED";
}
