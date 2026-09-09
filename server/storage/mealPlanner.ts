import { db } from "../db";
import { mealPlanEntries, recipes, type MealPlanEntry } from "@shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export type NewItem = {
  recipeId?: number | null;
  note?: string | null;
};

export async function getWeek(startDate: string, endDate: string): Promise<MealPlanEntry[]> {
  return db
    .select()
    .from(mealPlanEntries)
    .where(and(gte(mealPlanEntries.date, startDate), lte(mealPlanEntries.date, endDate)))
    .orderBy(mealPlanEntries.date, mealPlanEntries.id);
}

export async function addItem(date: string, slot: string, item: NewItem): Promise<MealPlanEntry> {
  const recipeId = item.recipeId ?? null;
  const note = recipeId === null ? item.note ?? null : null;

  let recipeNameSnapshot: string | null = null;
  if (recipeId !== null) {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) {
      const error = new Error("Recipe no longer exists") as Error & { status?: number };
      error.status = 404;
      throw error;
    }
    recipeNameSnapshot = recipe.name;
  }

  const [entry] = await db
    .insert(mealPlanEntries)
    .values({ date, slot, recipeId, recipeNameSnapshot, note })
    .returning();

  return entry;
}

export async function removeItem(id: number): Promise<boolean> {
  const result = await db
    .delete(mealPlanEntries)
    .where(eq(mealPlanEntries.id, id))
    .returning({ id: mealPlanEntries.id });
  return result.length > 0;
}

export async function clearSlot(date: string, slot: string): Promise<boolean> {
  const result = await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.date, date), eq(mealPlanEntries.slot, slot)))
    .returning({ id: mealPlanEntries.id });
  return result.length > 0;
}
