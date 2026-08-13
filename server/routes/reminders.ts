import { Router } from "express";
import { z } from "zod";
import { insertReminderSchema, updateReminderSchema } from "@shared/schema";
import * as reminderStorage from "../storage/reminders";
import { wrap } from "../lib/asyncHandler";

export const remindersRouter = Router();

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

remindersRouter.get(
  "/",
  wrap(async (_req, res) => {
    res.json(await reminderStorage.listReminders());
  })
);

remindersRouter.post("/", async (req, res, next) => {
  try {
    const data = insertReminderSchema.parse(req.body);
    res.status(201).json(await reminderStorage.createReminder(data));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

remindersRouter.patch("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid reminder id" });
    return;
  }
  try {
    const data = updateReminderSchema.parse(req.body);
    const reminder = await reminderStorage.updateReminder(id, data);
    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }
    res.json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

remindersRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid reminder id" });
      return;
    }
    const deleted = await reminderStorage.deleteReminder(id);
    if (!deleted) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }
    res.status(204).send();
  })
);
