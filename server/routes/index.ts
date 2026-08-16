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

  // KitchenPlanner has its own independent account again (each app in the suite manages
  // its own login/branding) — every data route requires it.
  app.use("/api/recipes", requireAuth, recipesRouter);
  app.use("/api/meal-plan", requireAuth, mealPlannerRouter);
  app.use("/api/grocery", requireAuth, groceryRouter);
  app.use("/api/pantry", requireAuth, pantryRouter);
  app.use("/api/upload", requireAuth, uploadRouter);
  app.use("/api/reminders", requireAuth, remindersRouter);

  return createServer(app);
}
