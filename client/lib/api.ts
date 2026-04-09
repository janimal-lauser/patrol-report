import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3434";

const TOKEN_KEY = "patrol_auth_access_token";
const REFRESH_TOKEN_KEY = "patrol_auth_refresh_token";

// Token-Speicherung: SecureStore auf nativ, AsyncStorage als Fallback fuer Web
async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function storeTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await setToken(accessToken);
  await setRefreshToken(refreshToken);
}

// Callback fuer automatisches Logout bei ungueltigem Token
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

// Generische API-Funktion mit automatischem Auth-Header und Token-Refresh
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  let res = await fetch(url, {
    ...options,
    headers,
  });

  // Bei 401: Token-Refresh versuchen
  if (res.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }

    // Wenn immer noch 401: Logout
    if (res.status === 401) {
      await clearTokens();
      onUnauthorized?.();
      throw new Error("Sitzung abgelaufen. Bitte erneut einloggen.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message || `Fehler ${res.status}`);
  }

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const { data } = await res.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// --- Auth API ---

export const authApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: "Login fehlgeschlagen" } }));
      throw new Error(body.error?.message || "Login fehlgeschlagen");
    }

    const { data } = await res.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  async me() {
    const result = await apiFetch<{ data: any }>("/api/auth/me");
    return result.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// --- Shift API ---

export const shiftApi = {
  async syncShift(shiftData: {
    clientId: string;
    startTime: number;
    endTime?: number;
    trackingMode?: string;
    status?: string;
    summaryData?: unknown;
    events?: Array<{
      id: string;
      type: string;
      timestamp: number;
      latitude: number;
      longitude: number;
      note?: string;
      photoUri?: string;
    }>;
    routePoints?: Array<{
      latitude: number;
      longitude: number;
      timestamp: number;
      mode: string;
      accuracy?: number;
    }>;
  }) {
    const result = await apiFetch<{ data: any }>("/api/shifts", {
      method: "POST",
      body: JSON.stringify(shiftData),
    });
    return result.data;
  },

  async listShifts(params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);

    const query = searchParams.toString();
    const path = query ? `/api/shifts?${query}` : "/api/shifts";
    const result = await apiFetch<{ data: any[] }>(path);
    return result.data;
  },

  async getShift(id: string) {
    const result = await apiFetch<{ data: any }>(`/api/shifts/${id}`);
    return result.data;
  },
};

// --- User API (Admin) ---

export const userApi = {
  async listUsers() {
    const result = await apiFetch<{ data: any[] }>("/api/users");
    return result.data;
  },

  async createUser(data: {
    email: string;
    name?: string;
    password: string;
    role?: string;
  }) {
    const result = await apiFetch<{ data: any }>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result.data;
  },
};

// --- Company API ---

export const companyApi = {
  async getCompany() {
    const result = await apiFetch<{ data: any }>("/api/company");
    return result.data;
  },
};

// --- Checkpoint API ---

export const checkpointApi = {
  async list() {
    const result = await apiFetch<{ data: any[] }>("/api/checkpoints");
    return result.data;
  },
};
