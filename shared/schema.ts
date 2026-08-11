import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, jsonb, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
  prepTimeMinutes: integer("prep_time_minutes"),
  tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
  imageUrl: varchar("image_url", { length: 500 }),
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
    prepTimeMinutes: z.number().int().positive().nullable().optional(),
    tags: z.array(z.string().min(1)).default([]),
    imageUrl: z.string().url().nullable().optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = Omit<typeof recipes.$inferSelect, "ingredients" | "tags"> & {
  ingredients: RecipeIngredient[];
  tags: string[];
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

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  quantity: varchar("quantity", { length: 50 }),
  checked: boolean("checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroceryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.string().nullable().optional(),
});

export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;
export type GroceryItem = typeof groceryItems.$inferSelect;

export const prepTasks = pgTable("prep_tasks", {
  id: serial("id").primaryKey(),
  description: varchar("description", { length: 200 }).notNull(),
  forDate: varchar("for_date", { length: 10 }).notNull(),
  checked: boolean("checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrepTaskSchema = z.object({
  description: z.string().min(1, "Task description is required"),
  forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "forDate must be YYYY-MM-DD"),
});

export type InsertPrepTask = z.infer<typeof insertPrepTaskSchema>;
export type PrepTask = typeof prepTasks.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 60 }).notNull(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  newsletterOptIn: boolean("newsletter_opt_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const requestOtpSchema = z.object({ email: emailSchema });
export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, "Enter the 6-digit code"),
});
export const completeSignupSchema = z.object({
  email: emailSchema,
  username: z.string().trim().min(1, "Username is required").max(60),
  signupToken: z.string().min(1),
});
export const updateAccountSchema = z.object({
  username: z.string().trim().min(1).max(60).optional(),
  notificationsEnabled: z.boolean().optional(),
  newsletterOptIn: z.boolean().optional(),
});
