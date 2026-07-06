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

export type MasterCurrencyItem = {
  id: string;
  code: string;
  name: string;
  rateToAed: number;
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

async function parseRegionResponse(response: Response): Promise<MasterRegionItem> {
  const body = (await response.json().catch(() => ({}))) as { message?: string; item?: MasterRegionItem };
  if (!response.ok) {
    throw new Error(body.message ?? "Master region request failed");
  }
  if (!body.item) {
    throw new Error("Master region request failed");
  }
  return body.item;
}

async function parseCurrencyResponse(response: Response): Promise<MasterCurrencyItem> {
  const body = (await response.json().catch(() => ({}))) as { message?: string; item?: MasterCurrencyItem };
  if (!response.ok) {
    throw new Error(body.message ?? "Master currency request failed");
  }
  if (!body.item) {
    throw new Error("Master currency request failed");
  }
  return body.item;
}

export async function listMasterCurrencies(token: string): Promise<MasterCurrencyItem[]> {
  const response = await fetch(`${API_BASE}/master-data/currencies`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load master currencies");
  }
  const data = (await response.json()) as { items: MasterCurrencyItem[] };
  return data.items;
}

export async function createMasterRegion(
  token: string,
  payload: { name: string; defaultCurrencyCode?: string },
): Promise<MasterRegionItem> {
  const response = await fetch(`${API_BASE}/master-data/regions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseRegionResponse(response);
}

export async function updateMasterRegion(
  token: string,
  regionId: string,
  payload: Partial<Pick<MasterRegionItem, "name" | "defaultCurrencyCode" | "sortOrder" | "isActive">>,
): Promise<MasterRegionItem> {
  const response = await fetch(`${API_BASE}/master-data/regions/${regionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseRegionResponse(response);
}

export async function createMasterCurrency(
  token: string,
  payload: { code: string; name: string; rateToAed: number },
): Promise<MasterCurrencyItem> {
  const response = await fetch(`${API_BASE}/master-data/currencies`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseCurrencyResponse(response);
}

export async function updateMasterCurrency(
  token: string,
  currencyId: string,
  payload: Partial<Pick<MasterCurrencyItem, "name" | "rateToAed" | "sortOrder" | "isActive">>,
): Promise<MasterCurrencyItem> {
  const response = await fetch(`${API_BASE}/master-data/currencies/${currencyId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseCurrencyResponse(response);
}
