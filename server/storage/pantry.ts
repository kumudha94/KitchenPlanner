import { db } from "../db";
import { pantryItems, type InsertPantryItem, type PantryItem } from "@shared/schema";
import { asc, eq } from "drizzle-orm";
import { categorizeItem } from "../lib/groceryCategorize";

export async function listItems(): Promise<PantryItem[]> {
  return db.select().from(pantryItems).orderBy(asc(pantryItems.name));
}

export async function addItem(data: InsertPantryItem): Promise<PantryItem> {
  const [item] = await db
    .insert(pantryItems)
    .values({
      name: data.name,
      category: data.category ?? categorizeItem(data.name),
      quantity: data.quantity ?? null,
      cost: data.cost != null ? String(data.cost) : null,
      expiryDate: data.expiryDate ?? null,
    })
    .returning();
  return item;
}

export async function deleteItem(id: number): Promise<boolean> {
  const result = await db.delete(pantryItems).where(eq(pantryItems.id, id)).returning({ id: pantryItems.id });
  return result.length > 0;
}
