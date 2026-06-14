const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001/api/v1";

export type FollowUpChannel = "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting";
export type FollowUpStatus = "Overdue" | "Due today" | "Upcoming" | "Done";

export type ApiFollowUp = {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string | null;
  ownerName: string | null;
  contact: string;
  contactRole: string;
  dueAt: string;
  channel: FollowUpChannel;
  status: FollowUpStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export async function listFollowUps(token: string): Promise<ApiFollowUp[]> {
  const response = await fetch(`${API_BASE}/follow-ups`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load follow-ups");
  }
  const data = (await response.json()) as { items: ApiFollowUp[] };
  return data.items;
}

export async function createFollowUp(
  token: string,
  payload: {
    projectId: string;
    ownerId?: string | null;
    contact: string;
    contactRole: string;
    dueAt: string;
    channel: FollowUpChannel;
    note: string;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/follow-ups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create follow-up");
  }
}

export async function updateFollowUp(
  token: string,
  followUpId: string,
  payload: {
    dueAt?: string;
    channel?: FollowUpChannel;
    status?: FollowUpStatus;
    note?: string;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/follow-ups/${followUpId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to update follow-up");
  }
}
