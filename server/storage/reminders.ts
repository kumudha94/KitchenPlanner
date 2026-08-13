import { db } from "../db";
import { reminders, type InsertReminder, type Reminder } from "@shared/schema";
import { asc, eq } from "drizzle-orm";

export async function listReminders(): Promise<Reminder[]> {
  return db.select().from(reminders).orderBy(asc(reminders.hour), asc(reminders.minute));
}

export async function createReminder(data: InsertReminder): Promise<Reminder> {
  const [reminder] = await db.insert(reminders).values(data).returning();
  return reminder;
}

export async function updateReminder(id: number, data: Partial<InsertReminder>): Promise<Reminder | undefined> {
  const [reminder] = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
  return reminder;
}

export async function deleteReminder(id: number): Promise<boolean> {
  const result = await db.delete(reminders).where(eq(reminders.id, id)).returning({ id: reminders.id });
  return result.length > 0;
}
