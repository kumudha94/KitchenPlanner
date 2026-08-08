import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type RecipeIngredient = { name: string; quantity: string };

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  mealType: varchar("meal_type", { length: 20 }),
  ingredients: jsonb("ingredients").notNull().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecipeSchema = createInsertSchema(recipes)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().min(1, "Recipe name is required"),
    mealType: z.enum(MEAL_TYPES).optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.string().min(1),
        })
      )
      .default([]),
    notes: z.string().optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = Omit<typeof recipes.$inferSelect, "ingredients"> & {
  ingredients: RecipeIngredient[];
};
