import { Router } from "express";
import { z } from "zod";
import { insertPantryItemSchema } from "@shared/schema";
import * as pantryStorage from "../storage/pantry";
import { wrap } from "../lib/asyncHandler";

export const pantryRouter = Router();

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

pantryRouter.get(
  "/",
  wrap(async (_req, res) => {
    res.json(await pantryStorage.listItems());
  })
);

pantryRouter.post("/", async (req, res, next) => {
  try {
    const data = insertPantryItemSchema.parse(req.body);
    res.status(201).json(await pantryStorage.addItem(data));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

pantryRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid item id" });
      return;
    }
    const deleted = await pantryStorage.deleteItem(id);
    if (!deleted) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.status(204).send();
  })
);
