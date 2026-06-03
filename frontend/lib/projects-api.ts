const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export type ApiProject = {
  id: string;
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: "alubond architecture" | "alubond transport" | "uniqube" | null;
  stage: string;
  valueAed: number;
  itemName: string;
  itemQuantity: number;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  owner: string;
  managerId: string;
  managerName: string;
  salesRepIds: string[];
  salesRepNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectActivity = {
  id: string;
  projectId: string;
  type: "note" | "call" | "visit" | "email" | "whatsapp" | "stage";
  message: string;
  visitWhatHappened: string | null;
  visitLat: number | null;
  visitLng: number | null;
  visitAccuracyM: number | null;
  attachments: Array<{
    id: string;
    kind: "file" | "voice";
    name: string;
    filename: string;
    size: number;
    mimeType: string;
    url: string;
    createdAt: string;
  }>;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ProjectStakeholder = {
  id: string;
  projectId: string;
  role: "Architect" | "Consultant" | "Contractor" | "Fabricator" | "Developer" | "Other";
  name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ProjectUpsertPayload = {
  name: string;
  city: string;
  country: string;
  developer: string;
  businessDivision: "alubond architecture" | "alubond transport" | "uniqube" | null;
  stage: string;
  valueAed: number;
  itemName: string;
  itemQuantity: number;
  lat: number;
  lng: number;
  probability: number;
  daysInStage: number;
  competitor: string | null;
  managerId: string;
  salesRepIds: string[];
};

export async function listProjects(token: string): Promise<ApiProject[]> {
  const response = await fetch(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Failed to load projects");
  }
  const data = (await response.json()) as { items: ApiProject[] };
  return data.items;
}

export async function getProject(token: string, projectId: string): Promise<ApiProject> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Failed to load project");
  }
  const data = (await response.json()) as { project: ApiProject };
  return data.project;
}

export async function createProject(token: string, payload: ProjectUpsertPayload): Promise<ApiProject> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create project");
  }
  const data = (await response.json()) as { project: ApiProject };
  return data.project;
}

export async function updateProject(
  token: string,
  projectId: string,
  payload: ProjectUpsertPayload
): Promise<ApiProject> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to update project");
  }
  const data = (await response.json()) as { project: ApiProject };
  return data.project;
}

export async function listProjectActivities(token: string, projectId: string): Promise<ProjectActivity[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/activities`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Failed to load project activities");
  }
  const data = (await response.json()) as { items: ProjectActivity[] };
  return data.items;
}

export async function createProjectActivity(
  token: string,
  projectId: string,
  payload: {
    type: ProjectActivity["type"];
    message: string;
    followUpDueAt?: string;
    visitWhatHappened?: string;
    visitLocation?: {
      lat: number;
      lng: number;
      accuracyM?: number | null;
    };
    attachments?: Array<{
      kind: "file" | "voice";
      name: string;
      filename: string;
      size: number;
      mimeType: string;
      url: string;
    }>;
  }
): Promise<ProjectActivity> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create activity");
  }
  const data = (await response.json()) as { activity: ProjectActivity };
  return data.activity;
}

export async function deleteProjectActivity(
  token: string,
  projectId: string,
  activityId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/activities/${activityId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to delete activity");
  }
}

export async function updateProjectActivity(
  token: string,
  projectId: string,
  activityId: string,
  payload: {
    type: ProjectActivity["type"];
    message: string;
    visitWhatHappened?: string | null;
  }
): Promise<ProjectActivity> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/activities/${activityId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to update activity");
  }
  const data = (await response.json()) as { activity: ProjectActivity };
  return data.activity;
}

export async function listProjectStakeholders(token: string, projectId: string): Promise<ProjectStakeholder[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/stakeholders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("Failed to load project stakeholders");
  }
  const data = (await response.json()) as { items: ProjectStakeholder[] };
  return data.items;
}

export async function createProjectStakeholder(
  token: string,
  projectId: string,
  payload: {
    role: ProjectStakeholder["role"];
    name: string;
    organization?: string | null;
    email?: string | null;
    phone?: string | null;
  }
): Promise<ProjectStakeholder> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/stakeholders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create stakeholder");
  }
  const data = (await response.json()) as { stakeholder: ProjectStakeholder };
  return data.stakeholder;
}

export async function updateProjectStakeholder(
  token: string,
  projectId: string,
  stakeholderId: string,
  payload: {
    role: ProjectStakeholder["role"];
    name: string;
    organization?: string | null;
    email?: string | null;
    phone?: string | null;
  }
): Promise<ProjectStakeholder> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/stakeholders/${stakeholderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to update stakeholder");
  }
  const data = (await response.json()) as { stakeholder: ProjectStakeholder };
  return data.stakeholder;
}

export async function deleteProjectStakeholder(
  token: string,
  projectId: string,
  stakeholderId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/stakeholders/${stakeholderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to delete stakeholder");
  }
}

export async function uploadActivityAttachment(
  token: string,
  file: File
): Promise<{ kind: "file" | "voice"; name: string; filename: string; size: number; mimeType: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/uploads/activity-attachment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to upload attachment");
  }
  const data = (await response.json()) as {
    file: { kind: "file" | "voice"; name: string; filename: string; size: number; mimeType: string; url: string };
  };
  return data.file;
}
