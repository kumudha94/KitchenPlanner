import { API_BASE_URL } from "./api";
import { getToken } from "./authStorage";
import type { RecipeIngredient } from "./types";

export type ParsedRecipeFromImage = {
  name: string;
  servings: number;
  prepTimeMinutes: number;
  ingredients: RecipeIngredient[];
  notes: string;
  tags: string[];
};

export async function parseRecipeScreenshot(
  uri: string,
  fileName: string,
  mimeType: string
): Promise<ParsedRecipeFromImage> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("image", { uri, name: fileName, type: mimeType } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/recipes/parse-screenshot`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Import failed (${response.status})`;
    try {
      message = JSON.parse(text).error || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }

  return response.json();
}
