import { API_BASE } from "./config";

export type MasterRegionItem = {
  id: string;
  name: string;
  defaultCurrencyCode: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActiveCurrencyItem = {
  code: string;
  name: string;
  rateToAed: number;
};

export type ActiveRegionDefault = {
  name: string;
  defaultCurrencyCode: string;
};

export async function listMasterRegions(token: string): Promise<MasterRegionItem[]> {
  const response = await fetch(`${API_BASE}/master-data/regions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load master regions");
  }
  const data = (await response.json()) as { items: MasterRegionItem[] };
  return data.items;
}

export async function listActiveRegionDefaults(token: string): Promise<ActiveRegionDefault[]> {
  const response = await fetch(`${API_BASE}/master-data/regions/active`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load region defaults");
  }
  const data = (await response.json()) as { items: ActiveRegionDefault[] };
  return data.items;
}

export async function listActiveCurrencies(token: string): Promise<ActiveCurrencyItem[]> {
  const response = await fetch(`${API_BASE}/master-data/currencies/active`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load currencies");
  }
  const data = (await response.json()) as { items: ActiveCurrencyItem[] };
  return data.items;
}
