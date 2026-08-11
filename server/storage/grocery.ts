import { db } from "../db";
import { groceryItems, mealPlanEntries, recipes, type GroceryItem, type InsertGroceryItem } from "@shared/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";

export async function listItems(): Promise<GroceryItem[]> {
  return db.select().from(groceryItems).orderBy(asc(groceryItems.checked), asc(groceryItems.createdAt));
}

export async function addItem(data: InsertGroceryItem): Promise<GroceryItem> {
  const [item] = await db
    .insert(groceryItems)
    .values({ name: data.name, quantity: data.quantity ?? null })
    .returning();
  return item;
}

export async function setChecked(id: number, checked: boolean): Promise<GroceryItem | undefined> {
  const [item] = await db.update(groceryItems).set({ checked }).where(eq(groceryItems.id, id)).returning();
  return item;
}

export async function deleteItem(id: number): Promise<boolean> {
  const result = await db.delete(groceryItems).where(eq(groceryItems.id, id)).returning({ id: groceryItems.id });
  return result.length > 0;
}

export async function clearChecked(): Promise<number> {
  const result = await db.delete(groceryItems).where(eq(groceryItems.checked, true)).returning({ id: groceryItems.id });
  return result.length;
}

// Pulls every ingredient from recipes planned in [startDate, endDate] and adds
// any not already present as an unchecked item (matched by name+quantity, so
// re-running for the same week is safe and won't pile up duplicates).
export async function addFromPlan(startDate: string, endDate: string): Promise<GroceryItem[]> {
  const entries = await db
    .select()
    .from(mealPlanEntries)
    .where(and(gte(mealPlanEntries.date, startDate), lte(mealPlanEntries.date, endDate)));

  const recipeIds = Array.from(new Set(entries.map((e) => e.recipeId).filter((id): id is number => id !== null)));
  if (recipeIds.length === 0) return [];

  const plannedRecipes = await db.select().from(recipes);
  const recipeById = new Map(plannedRecipes.map((r) => [r.id, r]));

  const existing = await db.select().from(groceryItems).where(eq(groceryItems.checked, false));
  const existingKeys = new Set(existing.map((i) => `${i.name.toLowerCase()}|${i.quantity ?? ""}`));

  const toInsert: InsertGroceryItem[] = [];
  const seen = new Set<string>();
  for (const recipeId of recipeIds) {
    const recipe = recipeById.get(recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients as { name: string; quantity: string }[]) {
      const key = `${ing.name.toLowerCase()}|${ing.quantity}`;
      if (existingKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      toInsert.push({ name: ing.name, quantity: ing.quantity });
    }
  }

  if (toInsert.length === 0) return [];
  return db.insert(groceryItems).values(toInsert).returning();
}
