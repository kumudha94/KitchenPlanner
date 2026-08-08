import { Router } from "express";
import { z } from "zod";
import * as mealPlanStorage from "../storage/mealPlanner";

export const mealPlannerRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const slotUpdateSchema = z.object({
  recipeId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

mealPlannerRouter.get("/", async (req, res) => {
  const start = String(req.query.start || "");
  const end = String(req.query.end || "");
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    res.status(400).json({ error: "start and end query params must be YYYY-MM-DD" });
    return;
  }
  res.json(await mealPlanStorage.getWeek(start, end));
});

mealPlannerRouter.put("/:date/:slot", async (req, res) => {
  if (!dateRegex.test(req.params.date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  try {
    const update = slotUpdateSchema.parse(req.body);
    const entry = await mealPlanStorage.upsertSlot(req.params.date, req.params.slot, update);
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid meal plan data" });
  }
});

mealPlannerRouter.delete("/:date/:slot", async (req, res) => {
  const deleted = await mealPlanStorage.clearSlot(req.params.date, req.params.slot);
  if (!deleted) {
    res.status(404).json({ error: "Slot is already empty" });
    return;
  }
  res.status(204).send();
});
