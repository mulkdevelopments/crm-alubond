export const OPERATING_COUNTRIES = [
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "Egypt",
  "India",
  "Sri Lanka",
] as const;

export type OperatingCountry = (typeof OPERATING_COUNTRIES)[number];

const COUNTRY_ALIASES: Record<string, OperatingCountry | string> = {
  UAE: "United Arab Emirates",
  KSA: "Saudi Arabia",
  "Sri lanka": "Sri Lanka",
};

export const COUNTRY_CITIES: Record<OperatingCountry, readonly string[]> = {
  "United Arab Emirates": [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
    "Al Ain",
  ],
  "Saudi Arabia": [
    "Riyadh",
    "Jeddah",
    "Dammam",
    "Khobar",
    "Dhahran",
    "Medina",
    "Mecca",
    "Tabuk",
    "Abha",
    "Jubail",
    "AlUla",
    "Yanbu",
    "NEOM",
  ],
  Qatar: ["Doha", "Lusail", "Al Wakrah", "Al Khor", "Al Rayyan"],
  Oman: ["Muscat", "Salalah", "Sohar", "Nizwa", "Duqm"],
  Kuwait: ["Kuwait City", "Ahmadi", "Hawalli", "Jahra", "Salmiya"],
  Bahrain: ["Manama", "Muharraq", "Riffa", "Hamad Town"],
  Egypt: ["Cairo", "Alexandria", "Giza", "New Administrative Capital", "Port Said", "Suez", "Luxor", "Aswan"],
  India: [
    "Alappuzha",
    "Bangalore",
    "Chennai",
    "Coimbatore",
    "Delhi",
    "Hyderabad",
    "Kochi",
    "Kolkata",
    "Madurai",
    "Mangalore",
    "Mumbai",
    "Pune",
    "Trivandrum",
    "Visakhapatnam",
  ],
  "Sri Lanka": ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo"],
};

export function normalizeCountryName(country: string): string {
  const trimmed = country.trim();
  if (!trimmed) return "";

  const alias = COUNTRY_ALIASES[trimmed] ?? COUNTRY_ALIASES[trimmed.toUpperCase()];
  if (alias) return alias;

  const match = OPERATING_COUNTRIES.find((entry) => entry.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

export function isOperatingCountry(country: string): country is OperatingCountry {
  const normalized = normalizeCountryName(country);
  return OPERATING_COUNTRIES.includes(normalized as OperatingCountry);
}

export function countryOptions(existingCountry?: string): string[] {
  const options = new Set<string>(OPERATING_COUNTRIES);
  const normalizedExisting = normalizeCountryName(existingCountry ?? "");
  if (normalizedExisting) options.add(normalizedExisting);
  return [...options].sort((a, b) => a.localeCompare(b));
}

export function citiesForCountry(
  country: string,
  params?: {
    existingCity?: string;
    projectCities?: string[];
  },
): string[] {
  const normalized = normalizeCountryName(country);
  const cities = new Set<string>();

  if (isOperatingCountry(normalized)) {
    for (const city of COUNTRY_CITIES[normalized as OperatingCountry]) {
      cities.add(city);
    }
  }

  for (const city of params?.projectCities ?? []) {
    const trimmed = city.trim();
    if (trimmed) cities.add(trimmed);
  }

  const existingCity = params?.existingCity?.trim();
  if (existingCity) cities.add(existingCity);

  return [...cities].sort((a, b) => a.localeCompare(b));
}

export function projectCitiesForCountry(
  projects: Array<{ city: string; country: string }>,
  country: string,
): string[] {
  const normalized = normalizeCountryName(country);
  if (!normalized) return [];

  const cities = new Set<string>();
  for (const project of projects) {
    if (normalizeCountryName(project.country) !== normalized) continue;
    const trimmed = project.city.trim();
    if (trimmed) cities.add(trimmed);
  }
  return [...cities];
}
