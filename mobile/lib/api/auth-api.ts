import { API_BASE } from "./config";

export type AuthUser = {
  id: string;
  email: string;
  role: "SALES_REP" | "MANAGER" | "REGIONAL_MANAGER" | "CEO" | "ADMIN";
  managerId: string | null;
  regionalManagerId?: string | null;
  regions?: string[];
  firstName?: string;
  lastName?: string;
  canSetBusinessDivision?: boolean;
};

export type Role = AuthUser["role"];

export type ManagerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  managerId: string | null;
};

export type UserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerId: string | null;
  regionalManagerId: string | null;
  reportsToId: string | null;
  regions: string[];
  operationLocations: string[];
  yearlyTarget: number | null;
  isActive: boolean;
  canSetBusinessDivision: boolean;
  createdAt: string;
  lastLocationPingAt: string | null;
  manager: ManagerOption | null;
  regionalManager: ManagerOption | null;
  reportsTo: ManagerOption | null;
};

export type UserLocationAttendanceDay = {
  date: string;
  pingsCount: number;
  activeMinutes: number;
};

export type UserLocationRoutePoint = {
  id: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  recordedAt: string;
};

export type UserLocationRoute = {
  date: string;
  points: UserLocationRoutePoint[];
  siteVisits: Array<{
    projectId: string;
    projectName: string;
    visitedAt: string;
  }>;
  assignedProjects: Array<{
    projectId: string;
    projectName: string;
    lat: number;
    lng: number;
    radiusM: number;
  }>;
};

export type LatestLocationPing = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  recordedAt: string;
};

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Invalid login credentials");
  }

  return response.json();
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Session invalid");
  }

  return response.json();
}

export async function updateMe(token: string, payload: { firstName: string; lastName: string }): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Profile update failed");
  }

  return response.json();
}

export async function resetMyPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string }
): Promise<void> {
  const response = await fetch(`${API_BASE}/users/me/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Password update failed");
  }
}

export async function listUsers(token: string): Promise<UserListItem[]> {
  const response = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load users");
  }

  const data = (await response.json()) as { items: UserListItem[] };
  return data.items;
}

export async function listManagers(token: string): Promise<ManagerOption[]> {
  const response = await fetch(`${API_BASE}/users/managers`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load managers");
  }

  const data = (await response.json()) as { items: ManagerOption[] };
  return data.items;
}

export async function listRegionalManagers(token: string): Promise<ManagerOption[]> {
  const response = await fetch(`${API_BASE}/users/regional-managers`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load regional managers");
  }

  const data = (await response.json()) as { items: ManagerOption[] };
  return data.items;
}

export async function listCeos(token: string): Promise<ManagerOption[]> {
  const response = await fetch(`${API_BASE}/users/ceos`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load CEOs");
  }

  const data = (await response.json()) as { items: ManagerOption[] };
  return data.items;
}

export async function listMyTeam(token: string): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE}/users/my-team`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load team members");
  }

  const data = (await response.json()) as { items: TeamMember[] };
  return data.items;
}

export async function createUser(
  token: string,
  payload: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: Role;
  managerId?: string | null;
  regionalManagerId?: string | null;
  reportsToId?: string | null;
  regions?: string[];
    operationLocations: string[];
    yearlyTarget?: number | null;
    canSetBusinessDivision?: boolean;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to create user");
  }
}

export async function updateUser(
  token: string,
  userId: string,
  payload: {
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  managerId?: string | null;
  regionalManagerId?: string | null;
  reportsToId?: string | null;
  regions?: string[];
    operationLocations: string[];
    yearlyTarget?: number | null;
    password?: string;
    isActive?: boolean;
    canSetBusinessDivision?: boolean;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      issues?: { fieldErrors?: Record<string, string[]> };
    };
    const fieldErrors = body.issues?.fieldErrors;
    const details = fieldErrors
      ? Object.entries(fieldErrors)
          .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
          .join('; ')
      : '';
    throw new Error(details ? `${body.message ?? 'Failed to update user'} (${details})` : body.message ?? 'Failed to update user');
  }
}

export async function deleteUser(token: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to delete user");
  }
}

export async function createLocationPing(
  token: string,
  payload: { lat: number; lng: number; accuracyM?: number | null; recordedAt?: string }
): Promise<void> {
  const response = await fetch(`${API_BASE}/users/location-pings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to save location ping");
  }
}

export async function getMyLatestLocationPing(token: string): Promise<LatestLocationPing | null> {
  const response = await fetch(`${API_BASE}/users/me/location-latest`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load latest location ping");
  }
  const data = (await response.json()) as { ping: LatestLocationPing | null };
  return data.ping;
}

export async function getUserLocationAttendance(
  token: string,
  userId: string,
  month: string
): Promise<{ month: string; days: UserLocationAttendanceDay[] }> {
  const tzOffsetMinutes = new Date().getTimezoneOffset();
  const response = await fetch(
    `${API_BASE}/users/${userId}/location-attendance?month=${encodeURIComponent(month)}&tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`,
    {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
    }
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to load attendance");
  }
  return response.json();
}

export async function getUserLocationRoute(
  token: string,
  userId: string,
  date: string
): Promise<UserLocationRoute> {
  const tzOffsetMinutes = new Date().getTimezoneOffset();
  const response = await fetch(
    `${API_BASE}/users/${userId}/location-route?date=${encodeURIComponent(date)}&tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`,
    {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
    }
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to load route");
  }
  return response.json();
}
