import { db } from "../db";
import { mealPlanEntries, recipes, type MealPlanEntry } from "@shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export type SlotUpdate = {
  recipeId?: number | null;
  note?: string | null;
};

export async function getWeek(startDate: string, endDate: string): Promise<MealPlanEntry[]> {
  return db
    .select()
    .from(mealPlanEntries)
    .where(and(gte(mealPlanEntries.date, startDate), lte(mealPlanEntries.date, endDate)))
    .orderBy(mealPlanEntries.date);
}

export async function upsertSlot(date: string, slot: string, update: SlotUpdate): Promise<MealPlanEntry> {
  let recipeNameSnapshot: string | null = null;
  if (update.recipeId) {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, update.recipeId));
    recipeNameSnapshot = recipe?.name ?? null;
  }

  const [entry] = await db
    .insert(mealPlanEntries)
    .values({
      date,
      slot,
      recipeId: update.recipeId ?? null,
      recipeNameSnapshot,
      note: update.note ?? null,
    })
    .onConflictDoUpdate({
      target: [mealPlanEntries.date, mealPlanEntries.slot],
      set: {
        recipeId: update.recipeId ?? null,
        recipeNameSnapshot,
        note: update.note ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return entry;
}

export async function clearSlot(date: string, slot: string): Promise<boolean> {
  const result = await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.date, date), eq(mealPlanEntries.slot, slot)))
    .returning({ id: mealPlanEntries.id });
  return result.length > 0;
}
