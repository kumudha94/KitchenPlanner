import { db } from "../db";
import { users, otpCodes, type User } from "@shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";

const OTP_TTL_MS = 5 * 60 * 1000;

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function findUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function findFirstUser(): Promise<User | undefined> {
  const [user] = await db.select().from(users).orderBy(users.id).limit(1);
  return user;
}

export async function createUser(email: string, username: string): Promise<User> {
  const [user] = await db.insert(users).values({ email, username }).returning();
  return user;
}

export async function updateUser(
  id: number,
  data: Partial<Pick<User, "username" | "notificationsEnabled" | "newsletterOptIn">>
): Promise<User | undefined> {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user;
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return result.length > 0;
}

export async function storeOtp(email: string, code: string): Promise<Date> {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db.insert(otpCodes).values({ email, code, expiresAt });
  return expiresAt;
}

export async function consumeOtp(email: string, code: string): Promise<boolean> {
  const [match] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.code, code), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!match) return false;
  await db.delete(otpCodes).where(eq(otpCodes.email, email));
  return true;
}
