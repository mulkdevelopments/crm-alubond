import { API_BASE } from "./config";

export type CustomerListItem = {
  id: string;
  name: string;
  projectCount: number;
  deletedAt: string | null;
  deletedByName: string | null;
};

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body.message ?? fallback;
}

export async function listCustomers(token: string): Promise<CustomerListItem[]> {
  const response = await fetch(`${API_BASE}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load customers"));
  }
  const data = (await response.json()) as { items: CustomerListItem[] };
  return data.items;
}

export async function listTrashedCustomers(token: string): Promise<CustomerListItem[]> {
  const response = await fetch(`${API_BASE}/customers/trash`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load trashed customers"));
  }
  const data = (await response.json()) as { items: CustomerListItem[] };
  return data.items;
}

export async function createCustomer(token: string, name: string): Promise<CustomerListItem> {
  const response = await fetch(`${API_BASE}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to create customer"));
  }
  const data = (await response.json()) as { customer: CustomerListItem };
  return data.customer;
}

export async function renameCustomer(
  token: string,
  from: string,
  to: string,
): Promise<{ from: string; to: string; updatedCount: number }> {
  const response = await fetch(`${API_BASE}/customers/rename`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ from, to }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to rename customer"));
  }
  return (await response.json()) as { from: string; to: string; updatedCount: number };
}

export async function trashCustomer(token: string, name: string): Promise<CustomerListItem> {
  const response = await fetch(`${API_BASE}/customers/trash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to move customer to trash"));
  }
  const data = (await response.json()) as { customer: CustomerListItem };
  return data.customer;
}

export async function restoreCustomer(token: string, customerId: string): Promise<CustomerListItem> {
  const response = await fetch(`${API_BASE}/customers/${customerId}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to restore customer"));
  }
  const data = (await response.json()) as { customer: CustomerListItem };
  return data.customer;
}

export async function permanentlyDeleteCustomer(token: string, customerId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/customers/${customerId}/permanent`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to permanently delete customer"));
  }
}
