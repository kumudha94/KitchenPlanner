export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
export type MealSlot = MealType;

export type RecipeIngredient = { name: string; quantity: string };

export type Recipe = {
  id: number;
  name: string;
  mealType: MealType | null;
  ingredients: RecipeIngredient[];
  notes: string | null;
  prepTimeMinutes: number | null;
  servings: number;
  tags: string[];
  imageUrl: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InsertRecipe = {
  name: string;
  mealType?: MealType | null;
  ingredients: RecipeIngredient[];
  notes?: string | null;
  prepTimeMinutes?: number | null;
  servings?: number;
  tags?: string[];
  imageUrl?: string | null;
  isFavorite?: boolean;
};

export type MealPlanEntry = {
  id: number;
  date: string;
  slot: MealSlot;
  recipeId: number | null;
  recipeNameSnapshot: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export const GROCERY_CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Pantry",
  "Other",
] as const;
export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export type GroceryItem = {
  id: number;
  name: string;
  quantity: string | null;
  category: GroceryCategory;
  checked: boolean;
  createdAt: string;
};

export type FromPlanResult = { added: GroceryItem[]; skippedInPantry: number };

export type PantryItem = {
  id: number;
  name: string;
  category: GroceryCategory;
  createdAt: string;
};

export type Reminder = {
  id: number;
  title: string;
  hour: number;
  minute: number;
  enabled: boolean;
  createdAt: string;
};

export type InsertReminder = {
  title: string;
  hour: number;
  minute: number;
  enabled?: boolean;
};

export type User = {
  id: number;
  email: string;
  username: string;
  notificationsEnabled: boolean;
  newsletterOptIn: boolean;
  createdAt: string;
};
