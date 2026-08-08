import { db } from "../db";
import { recipes, type InsertRecipe, type Recipe } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await db.select().from(recipes).orderBy(recipes.name);
  return rows as Recipe[];
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
