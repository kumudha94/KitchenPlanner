import { db } from "../db";
import { prepTasks, type PrepTask, type InsertPrepTask } from "@shared/schema";
import { asc, eq } from "drizzle-orm";

export async function listTasksForDate(date: string): Promise<PrepTask[]> {
  return db
    .select()
    .from(prepTasks)
    .where(eq(prepTasks.forDate, date))
    .orderBy(asc(prepTasks.checked), asc(prepTasks.createdAt));
}

export async function addTask(data: InsertPrepTask): Promise<PrepTask> {
  const [task] = await db
    .insert(prepTasks)
    .values({ description: data.description, forDate: data.forDate })
    .returning();
  return task;
}

export async function setChecked(id: number, checked: boolean): Promise<PrepTask | undefined> {
  const [task] = await db.update(prepTasks).set({ checked }).where(eq(prepTasks.id, id)).returning();
  return task;
}

export async function deleteTask(id: number): Promise<boolean> {
  const result = await db.delete(prepTasks).where(eq(prepTasks.id, id)).returning({ id: prepTasks.id });
  return result.length > 0;
}
