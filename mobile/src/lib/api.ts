export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

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
