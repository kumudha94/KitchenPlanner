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
  tags: string[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsertRecipe = {
  name: string;
  mealType?: MealType | null;
  ingredients: RecipeIngredient[];
  notes?: string | null;
  prepTimeMinutes?: number | null;
  tags?: string[];
  imageUrl?: string | null;
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
