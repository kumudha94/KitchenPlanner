import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "./authStorage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// Login lives on FinanceTracker now — one shared identity across FinanceTracker,
// KitchenPlanner, and Milo. See project notes for why.
const AUTH_API_BASE_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || "https://financetracker-ckvf.onrender.com";

let onUnauthorized: (() => void) | null = null;

// Registered by App.tsx once, so a 401 anywhere (expired/invalid session)
// can kick the user back to the login flow without every screen needing to
// handle it individually.
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

// FinanceTracker's access tokens are short-lived (15 min) by design, so a plain 401 doesn't
// necessarily mean "log out" — try to mint a fresh access token from the stored refresh
// token first, same retry-once pattern FinanceTracker's own mobile client uses.
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.accessToken) return null;
    await setAccessToken(data.accessToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const doFetch = (authToken: string | null) =>
    fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options?.headers,
      },
    });

  let response = await doFetch(token);

  if (response.status === 401) {
    const newToken = token ? await refreshAccessToken() : null;
    if (newToken) {
      response = await doFetch(newToken);
    } else {
      await clearTokens();
      onUnauthorized?.();
    }
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

export async function requestOtp(email: string): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // FinanceTracker's request-otp requires `username`, but only actually uses it if this
    // is a brand-new account — for the already-existing shared account it's ignored.
    body: JSON.stringify({ email, username: email.split("@")[0] }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't send the code.");
  }
}

export type AuthUser = { id: number; name: string; email: string };

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "That code didn't work.");
  }
  return body;
}
