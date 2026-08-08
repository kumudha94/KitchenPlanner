export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
export type MealSlot = MealType;

export type RecipeIngredient = { name: string; quantity: string };

export type Recipe = {
  id: number;
  name: string;
  mealType: MealType | null;
  ingredients: RecipeIngredient[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsertRecipe = {
  name: string;
  mealType?: MealType;
  ingredients: RecipeIngredient[];
  notes?: string;
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
