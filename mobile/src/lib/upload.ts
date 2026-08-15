import { API_BASE_URL } from "./api";
import { getAccessToken } from "./authStorage";

export async function uploadImage(uri: string, fileName: string, mimeType: string): Promise<string> {
  const token = await getAccessToken();
  const formData = new FormData();
  // React Native's fetch/FormData accepts this file-descriptor shape for a
  // local URI; it's not a real Blob/File so the DOM lib types don't cover
  // it, hence the cast.
  formData.append("image", { uri, name: fileName, type: mimeType } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Upload failed (${response.status})`;
    try {
      message = JSON.parse(text).error || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data.url as string;
}
