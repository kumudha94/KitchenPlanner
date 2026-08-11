import { Router } from "express";
import { z } from "zod";
import { insertPrepTaskSchema } from "@shared/schema";
import * as prepLogStorage from "../storage/prepLog";
import { wrap } from "../lib/asyncHandler";

export const prepLogRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

prepLogRouter.get(
  "/",
  wrap(async (req, res) => {
    const date = String(req.query.date || "");
    if (!dateRegex.test(date)) {
      res.status(400).json({ error: "date query param must be YYYY-MM-DD" });
      return;
    }
    res.json(await prepLogStorage.listTasksForDate(date));
  })
);

prepLogRouter.post("/", async (req, res, next) => {
  try {
    const data = insertPrepTaskSchema.parse(req.body);
    res.status(201).json(await prepLogStorage.addTask(data));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

prepLogRouter.patch(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }
    const checked = z.object({ checked: z.boolean() }).safeParse(req.body);
    if (!checked.success) {
      res.status(400).json({ error: "checked must be a boolean" });
      return;
    }
    const task = await prepLogStorage.setChecked(id, checked.data.checked);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  })
);

prepLogRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }
    const deleted = await prepLogStorage.deleteTask(id);
    if (!deleted) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(204).send();
  })
);
