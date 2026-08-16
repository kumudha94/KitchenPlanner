import { Router } from "express";
import { z } from "zod";
import { requestOtpSchema, verifyOtpSchema, updateAccountSchema } from "@shared/schema";
import * as authStorage from "../storage/auth";
import { generateOtpCode, signSessionToken } from "../lib/auth";
import { sendOtpEmail } from "../lib/emailjs";
import { requireAuth } from "../middleware/requireAuth";
import { wrap } from "../lib/asyncHandler";

export const authRouter = Router();

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

// One-step signup: request-otp creates the account immediately if it doesn't exist yet
// (same shape as FinanceTracker's own request-otp), so verify-otp can always just return
// tokens directly — no separate "finish creating your account" screen/step.
authRouter.post("/request-otp", async (req, res, next) => {
  try {
    const { email, username } = requestOtpSchema.parse(req.body);
    let user = await authStorage.findUserByEmail(email);
    if (!user) {
      user = await authStorage.createUser(email, username);
    }
    const code = generateOtpCode();
    const expiresAt = await authStorage.storeOtp(email, code);
    await sendOtpEmail(email, code, expiresAt);
    res.json({ sent: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

authRouter.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, code } = verifyOtpSchema.parse(req.body);
    const valid = await authStorage.consumeOtp(email, code);
    if (!valid) {
      res.status(400).json({ error: "That code is incorrect or has expired" });
      return;
    }

    const user = await authStorage.findUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "Account not found — request a new code" });
      return;
    }

    const token = signSessionToken({ userId: user.id, email: user.email });
    res.json({ token, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

// Read-only existence check for the cross-app "Connected Apps" flow (Milo asks "does an
// account with this email exist here" before offering to connect) — never creates an
// account, unlike request-otp above.
authRouter.get(
  "/exists",
  wrap(async (req, res) => {
    const email = typeof req.query.email === "string" ? req.query.email : undefined;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const user = await authStorage.findUserByEmail(email);
    res.json({ exists: !!user });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await authStorage.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(user);
  })
);

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateAccountSchema.parse(req.body);
    const user = await authStorage.updateUser(req.userId!, data);
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

authRouter.delete(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    await authStorage.deleteUser(req.userId!);
    res.status(204).send();
  })
);
