const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001/api/v1";

export type AccessRequestStatus = "PENDING" | "DISMISSED";

export type AccessRequestItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status: AccessRequestStatus;
  reviewedAt: string | null;
  reviewedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccessRequestFilter = "PENDING" | "DISMISSED" | "ALL";

async function parseAccessRequestResponse(response: Response): Promise<AccessRequestItem> {
  const body = (await response.json().catch(() => ({}))) as { message?: string; item?: AccessRequestItem };
  if (!response.ok) {
    throw new Error(body.message ?? "Access request update failed");
  }
  if (!body.item) {
    throw new Error("Access request update failed");
  }
  return body.item;
}

export async function listAccessRequests(
  token: string,
  status: AccessRequestFilter = "PENDING",
): Promise<AccessRequestItem[]> {
  const response = await fetch(`${API_BASE}/access-requests?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load access requests");
  }
  const data = (await response.json()) as { items: AccessRequestItem[] };
  return data.items;
}

export async function getPendingAccessRequestCount(token: string): Promise<number> {
  const response = await fetch(`${API_BASE}/access-requests/pending-count`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load access request count");
  }
  const data = (await response.json()) as { count: number };
  return data.count;
}

export async function dismissAccessRequest(token: string, requestId: string): Promise<AccessRequestItem> {
  const response = await fetch(`${API_BASE}/access-requests/${requestId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "DISMISSED" }),
  });
  return parseAccessRequestResponse(response);
}

export async function restoreAccessRequest(token: string, requestId: string): Promise<AccessRequestItem> {
  const response = await fetch(`${API_BASE}/access-requests/${requestId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "PENDING" }),
  });
  return parseAccessRequestResponse(response);
}

export async function deleteAccessRequest(token: string, requestId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/access-requests/${requestId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to delete access request");
  }
}
