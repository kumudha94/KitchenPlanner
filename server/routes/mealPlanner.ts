import { Router } from "express";
import { z } from "zod";
import { MEAL_TYPES } from "@shared/schema";
import * as mealPlanStorage from "../storage/mealPlanner";
import { wrap } from "../lib/asyncHandler";

export const mealPlannerRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const newItemSchema = z.object({
  recipeId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

function isValidSlot(slot: string): boolean {
  return (MEAL_TYPES as readonly string[]).includes(slot);
}

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

mealPlannerRouter.get(
  "/",
  wrap(async (req, res) => {
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      res.status(400).json({ error: "start and end query params must be YYYY-MM-DD" });
      return;
    }
    res.json(await mealPlanStorage.getWeek(start, end));
  })
);

mealPlannerRouter.post("/:date/:slot", async (req, res, next) => {
  if (!dateRegex.test(req.params.date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  if (!isValidSlot(req.params.slot)) {
    res.status(400).json({ error: `slot must be one of ${MEAL_TYPES.join(", ")}` });
    return;
  }
  try {
    const item = newItemSchema.parse(req.body);
    const entry = await mealPlanStorage.addItem(req.params.date, req.params.slot, item);
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

mealPlannerRouter.delete(
  "/item/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "id must be an integer" });
      return;
    }
    const deleted = await mealPlanStorage.removeItem(id);
    if (!deleted) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.status(204).send();
  })
);

mealPlannerRouter.delete(
  "/:date/:slot",
  wrap(async (req, res) => {
    if (!isValidSlot(req.params.slot)) {
      res.status(400).json({ error: `slot must be one of ${MEAL_TYPES.join(", ")}` });
      return;
    }
    const deleted = await mealPlanStorage.clearSlot(req.params.date, req.params.slot);
    if (!deleted) {
      res.status(404).json({ error: "Slot is already empty" });
      return;
    }
    res.status(204).send();
  })
);
