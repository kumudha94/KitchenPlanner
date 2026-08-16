import { db } from "../db";
import {
  groceryItems,
  mealPlanEntries,
  pantryItems,
  recipes,
  type GroceryItem,
  type InsertGroceryItem,
  type PantryItem,
} from "@shared/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { categorizeItem } from "../lib/groceryCategorize";
import { mergeIngredientQuantities, scaleQuantity } from "../lib/quantityScale";

export async function listItems(): Promise<GroceryItem[]> {
  return db.select().from(groceryItems).orderBy(asc(groceryItems.checked), asc(groceryItems.createdAt));
}

export async function addItem(data: InsertGroceryItem): Promise<GroceryItem> {
  const [item] = await db
    .insert(groceryItems)
    .values({ name: data.name, quantity: data.quantity ?? null, category: data.category ?? categorizeItem(data.name) })
    .returning();
  return item;
}

export async function setChecked(id: number, checked: boolean): Promise<GroceryItem | undefined> {
  const [item] = await db.update(groceryItems).set({ checked }).where(eq(groceryItems.id, id)).returning();
  return item;
}

export type MoveToPantryInput = { quantity?: string | null; cost?: number | null; expiryDate?: string | null };

// Purchased items graduate from the shopping list straight into the pantry:
// the grocery row is gone once it's tracked as pantry stock, rather than
// lingering "checked" until a manual Clear.
export async function moveToPantry(id: number, data: MoveToPantryInput): Promise<PantryItem | undefined> {
  return db.transaction(async (tx) => {
    const [groceryItem] = await tx.select().from(groceryItems).where(eq(groceryItems.id, id));
    if (!groceryItem) return undefined;

    const [pantryItem] = await tx
      .insert(pantryItems)
      .values({
        name: groceryItem.name,
        category: groceryItem.category,
        quantity: data.quantity ?? groceryItem.quantity ?? null,
        cost: data.cost != null ? String(data.cost) : null,
        expiryDate: data.expiryDate ?? null,
      })
      .returning();

    await tx.delete(groceryItems).where(eq(groceryItems.id, id));
    return pantryItem;
  });
}

export async function deleteItem(id: number): Promise<boolean> {
  const result = await db.delete(groceryItems).where(eq(groceryItems.id, id)).returning({ id: groceryItems.id });
  return result.length > 0;
}

export async function clearChecked(): Promise<number> {
  const result = await db.delete(groceryItems).where(eq(groceryItems.checked, true)).returning({ id: groceryItems.id });
  return result.length;
}

export type FromPlanResult = { added: GroceryItem[]; skippedInPantry: number };

// Pulls every ingredient from recipes planned in [startDate, endDate], scaled
// by how many times each recipe is planned in that range (so planning the
// same recipe twice asks for twice the ingredients), merges duplicates
// across recipes, drops anything already sitting in the Pantry, and adds
// what's left as unchecked grocery items (skipping anything already on the
// unchecked list by name, so re-running for the same week is safe).
export async function addFromPlan(startDate: string, endDate: string): Promise<FromPlanResult> {
  const entries = await db
    .select()
    .from(mealPlanEntries)
    .where(and(gte(mealPlanEntries.date, startDate), lte(mealPlanEntries.date, endDate)));

  const occurrences = new Map<number, number>();
  for (const entry of entries) {
    if (entry.recipeId === null) continue;
    occurrences.set(entry.recipeId, (occurrences.get(entry.recipeId) ?? 0) + 1);
  }
  if (occurrences.size === 0) return { added: [], skippedInPantry: 0 };

  const plannedRecipes = await db.select().from(recipes);
  const recipeById = new Map(plannedRecipes.map((r) => [r.id, r]));

  const scaledIngredients: { name: string; quantity: string }[] = [];
  for (const [recipeId, count] of Array.from(occurrences)) {
    const recipe = recipeById.get(recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients as { name: string; quantity: string }[]) {
      scaledIngredients.push({ name: ing.name, quantity: scaleQuantity(ing.quantity, count) });
    }
  }

  const merged = mergeIngredientQuantities(scaledIngredients);

  const pantry = await db.select().from(pantryItems);
  const pantryNames = new Set(pantry.map((p) => p.name.trim().toLowerCase()));

  const existing = await db.select().from(groceryItems).where(eq(groceryItems.checked, false));
  const existingNames = new Set(existing.map((i) => i.name.trim().toLowerCase()));

  let skippedInPantry = 0;
  const toInsert: InsertGroceryItem[] = [];
  for (const ing of merged) {
    const key = ing.name.trim().toLowerCase();
    if (pantryNames.has(key)) {
      skippedInPantry++;
      continue;
    }
    if (existingNames.has(key)) continue;
    toInsert.push({ name: ing.name, quantity: ing.quantity, category: categorizeItem(ing.name) });
  }

  if (toInsert.length === 0) return { added: [], skippedInPantry };
  const added = await db.insert(groceryItems).values(toInsert).returning();
  return { added, skippedInPantry };
}
