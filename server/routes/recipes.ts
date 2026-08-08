import { Router } from "express";
import { insertRecipeSchema } from "@shared/schema";
import * as recipeStorage from "../storage/recipes";

export const recipesRouter = Router();

recipesRouter.get("/", async (_req, res) => {
  res.json(await recipeStorage.listRecipes());
});

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await recipeStorage.getRecipe(Number(req.params.id));
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(recipe);
});

recipesRouter.post("/", async (req, res) => {
  try {
    const data = insertRecipeSchema.parse(req.body);
    const recipe = await recipeStorage.createRecipe(data);
    res.status(201).json(recipe);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid recipe data" });
  }
});

recipesRouter.patch("/:id", async (req, res) => {
  try {
    const data = insertRecipeSchema.partial().parse(req.body);
    const recipe = await recipeStorage.updateRecipe(Number(req.params.id), data);
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(recipe);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid recipe data" });
  }
});

recipesRouter.delete("/:id", async (req, res) => {
  const deleted = await recipeStorage.deleteRecipe(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.status(204).send();
});
