import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set.");
}
const JWT_SECRET = process.env.JWT_SECRET;

// KitchenPlanner no longer issues its own login tokens — identity is FinanceTracker's
// (single shared login across FinanceTracker/KitchenPlanner/Milo). This just verifies a
// token FinanceTracker issued. This env var is named JWT_SECRET here, but its value must
// equal FinanceTracker's SESSION_SECRET — FinanceTracker's own jwtService.ts falls back to
// SESSION_SECRET for signing since it has no JWT_SECRET set in its own environment.
// FinanceTracker's payload also has a `type: "access" | "refresh"` field we don't care about.
export type SessionPayload = { userId: number; email: string };

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
