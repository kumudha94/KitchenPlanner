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
  const [existing] = await db
    .select()
    .from(mealPlanEntries)
    .where(and(eq(mealPlanEntries.date, date), eq(mealPlanEntries.slot, slot)));

  const effectiveRecipeId =
    update.recipeId !== undefined ? update.recipeId : existing?.recipeId ?? null;
  const effectiveNote = update.note !== undefined ? update.note : existing?.note ?? null;

  // Only touch recipeNameSnapshot when the effective recipeId actually
  // differs from what's already stored — i.e. the caller chose a recipe or
  // explicitly cleared it. This is a value-diff rather than a raw
  // key-presence check because the mobile client always includes `recipeId`
  // in its PUT body (even when unchanged); gating on presence alone would
  // still wipe the snapshot on a note-only edit of a slot whose recipe was
  // already deleted. When nothing changed, the existing snapshot is carried
  // forward unchanged, same as any other omitted field.
  const recipeIdChanged = !existing || effectiveRecipeId !== (existing.recipeId ?? null);

  let recipeNameSnapshot: string | null = existing?.recipeNameSnapshot ?? null;
  if (recipeIdChanged) {
    if (effectiveRecipeId !== null) {
      const [recipe] = await db.select().from(recipes).where(eq(recipes.id, effectiveRecipeId));
      if (!recipe) {
        const error = new Error("Recipe no longer exists") as Error & { status?: number };
        error.status = 404;
        throw error;
      }
      recipeNameSnapshot = recipe.name;
    } else {
      recipeNameSnapshot = null;
    }
  }

  const [entry] = await db
    .insert(mealPlanEntries)
    .values({
      date,
      slot,
      recipeId: effectiveRecipeId,
      recipeNameSnapshot,
      note: effectiveNote,
    })
    .onConflictDoUpdate({
      target: [mealPlanEntries.date, mealPlanEntries.slot],
      set: {
        recipeId: effectiveRecipeId,
        recipeNameSnapshot,
        note: effectiveNote,
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
