import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { insertRecipeSchema } from "@shared/schema";
import * as recipeStorage from "../storage/recipes";
import { wrap } from "../lib/asyncHandler";
import { parseRecipeFromImage } from "../lib/anthropic";

export const recipesRouter = Router();

const uploadScreenshot = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedTypes.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files (jpeg, png, gif, webp) are allowed"));
  },
}).single("image");

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

recipesRouter.get(
  "/",
  wrap(async (_req, res) => {
    res.json(await recipeStorage.listRecipes());
  })
);

recipesRouter.get(
  "/recently-used",
  wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    res.json(await recipeStorage.listRecentlyUsed(limit));
  })
);

recipesRouter.get(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid recipe id" });
      return;
    }
    const recipe = await recipeStorage.getRecipe(id);
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(recipe);
  })
);

recipesRouter.post("/parse-screenshot", (req, res) => {
  uploadScreenshot(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No image file uploaded" });
      return;
    }
    try {
      const parsed = await parseRecipeFromImage(req.file.buffer, req.file.mimetype);
      res.json(parsed);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Recipe import failed" });
    }
  });
});

recipesRouter.post("/", async (req, res, next) => {
  try {
    const data = insertRecipeSchema.parse(req.body);
    const recipe = await recipeStorage.createRecipe(data);
    res.status(201).json(recipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

recipesRouter.patch("/:id", async (req, res, next) => {
  try {
    const data = insertRecipeSchema.partial().parse(req.body);
    const recipe = await recipeStorage.updateRecipe(Number(req.params.id), data);
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(recipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

recipesRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid recipe id" });
      return;
    }
    const deleted = await recipeStorage.deleteRecipe(id);
    if (!deleted) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.status(204).send();
  })
);
