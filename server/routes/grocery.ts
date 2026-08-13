import { Router } from "express";
import { z } from "zod";
import { insertGroceryItemSchema } from "@shared/schema";
import * as groceryStorage from "../storage/grocery";
import { wrap } from "../lib/asyncHandler";

export const groceryRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

groceryRouter.get(
  "/",
  wrap(async (_req, res) => {
    res.json(await groceryStorage.listItems());
  })
);

groceryRouter.post("/", async (req, res, next) => {
  try {
    const data = insertGroceryItemSchema.parse(req.body);
    res.status(201).json(await groceryStorage.addItem(data));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

groceryRouter.post(
  "/from-plan",
  wrap(async (req, res) => {
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      res.status(400).json({ error: "start and end query params must be YYYY-MM-DD" });
      return;
    }
    const result = await groceryStorage.addFromPlan(start, end);
    res.json(result);
  })
);

groceryRouter.patch(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid item id" });
      return;
    }
    const checked = z.object({ checked: z.boolean() }).safeParse(req.body);
    if (!checked.success) {
      res.status(400).json({ error: "checked must be a boolean" });
      return;
    }
    const item = await groceryStorage.setChecked(id, checked.data.checked);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  })
);

groceryRouter.delete(
  "/checked",
  wrap(async (_req, res) => {
    const count = await groceryStorage.clearChecked();
    res.json({ cleared: count });
  })
);

groceryRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid item id" });
      return;
    }
    const deleted = await groceryStorage.deleteItem(id);
    if (!deleted) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.status(204).send();
  })
);
