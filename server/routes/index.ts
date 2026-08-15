import type { Express } from "express";
import { createServer, type Server } from "http";
import { recipesRouter } from "./recipes";
import { mealPlannerRouter } from "./mealPlanner";
import { groceryRouter } from "./grocery";
import { pantryRouter } from "./pantry";
import { remindersRouter } from "./reminders";
import { authRouter } from "./auth";
import { uploadRouter } from "./upload";
import { requireAuth } from "../middleware/requireAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  // Core planning data is intentionally open — no login wall on the app's
  // main screens. This is a single shared dataset with no per-user
  // isolation, so "logged out" and "public" are the same exposure here by
  // design: recipes/meal-plan/grocery/pantry are low-sensitivity personal
  // data, and the product tradeoff is a frictionless start over hiding them.
  // Reminders stay behind requireAuth since they're framed as an
  // account-level feature (tied to notification setup), not a core screen.
  app.use("/api/recipes", recipesRouter);
  app.use("/api/meal-plan", mealPlannerRouter);
  app.use("/api/grocery", groceryRouter);
  app.use("/api/pantry", pantryRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/reminders", requireAuth, remindersRouter);

  return createServer(app);
}
