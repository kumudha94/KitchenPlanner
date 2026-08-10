import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
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
    mealType: z.enum(MEAL_TYPES).nullable().optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.string().min(1),
        })
      )
      .default([]),
    notes: z.string().nullable().optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = Omit<typeof recipes.$inferSelect, "ingredients"> & {
  ingredients: RecipeIngredient[];
};

export const mealPlanEntries = pgTable(
  "meal_plan_entries",
  {
    id: serial("id").primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    slot: varchar("slot", { length: 20 }).notNull(),
    recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    recipeNameSnapshot: varchar("recipe_name_snapshot", { length: 150 }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dateSlotIdx: uniqueIndex("meal_plan_date_slot_idx").on(table.date, table.slot),
  })
);

export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
