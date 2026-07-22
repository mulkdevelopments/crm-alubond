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
  if (country && COUNTRY_DEFAULT_CURRENCY[country]) {
    return COUNTRY_DEFAULT_CURRENCY[country];
  }

  for (const location of params.operationLocations ?? []) {
    const fromRegion = params.regionDefaults?.[location];
    if (fromRegion) return fromRegion;
  }

  return "AED";
}
