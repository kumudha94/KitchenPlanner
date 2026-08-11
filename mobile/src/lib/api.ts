import { getToken, clearToken } from "./authStorage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

let onUnauthorized: (() => void) | null = null;

// Registered by App.tsx once, so a 401 anywhere (expired/invalid session)
// can kick the user back to the login flow without every screen needing to
// handle it individually.
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    await clearToken();
    onUnauthorized?.();
  }

  if (!response.ok) {
    const text = await response.text();
    let message = `API error ${response.status}`;
    try {
      message = JSON.parse(text).error || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
