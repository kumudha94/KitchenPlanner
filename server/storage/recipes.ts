import { db } from "../db";
import { mealPlanEntries, recipes, type InsertRecipe, type Recipe } from "@shared/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await db.select().from(recipes).orderBy(recipes.name);
  return rows as Recipe[];
}

// Recipes actually cooked, most recent first — derived from meal plan
// history rather than a denormalized "last cooked" column, so it's always
// consistent with the plan itself. Only counts today-or-earlier entries
// (a recipe planned for next week hasn't been "used" yet).
export async function listRecentlyUsed(limit: number): Promise<Recipe[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .selectDistinctOn([mealPlanEntries.recipeId], {
      recipe: recipes,
      date: mealPlanEntries.date,
    })
    .from(mealPlanEntries)
    .innerJoin(recipes, eq(mealPlanEntries.recipeId, recipes.id))
    .where(sql`${mealPlanEntries.recipeId} is not null and ${mealPlanEntries.date} <= ${today}`)
    .orderBy(mealPlanEntries.recipeId, desc(mealPlanEntries.date));

  const sorted = rows.toSorted((a, b) => (a.date < b.date ? 1 : -1));
  return sorted.slice(0, limit).map((r) => r.recipe) as Recipe[];
}

export async function getRecipe(id: number): Promise<Recipe | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
  return recipe as Recipe | undefined;
}

export async function createRecipe(data: InsertRecipe): Promise<Recipe> {
  const [recipe] = await db.insert(recipes).values(data).returning();
  return recipe as Recipe;
}

export async function updateRecipe(id: number, data: Partial<InsertRecipe>): Promise<Recipe | undefined> {
  const [recipe] = await db
    .update(recipes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning();
  return recipe as Recipe | undefined;
}

export async function deleteRecipe(id: number): Promise<boolean> {
  const result = await db.delete(recipes).where(eq(recipes.id, id)).returning({ id: recipes.id });
  return result.length > 0;
}
