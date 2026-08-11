import { Router } from "express";
import { z } from "zod";
import { requestOtpSchema, verifyOtpSchema, completeSignupSchema, updateAccountSchema } from "@shared/schema";
import * as authStorage from "../storage/auth";
import { generateOtpCode, signSessionToken, signSignupToken, verifySignupToken } from "../lib/auth";
import { sendOtpEmail } from "../lib/emailjs";
import { requireAuth } from "../middleware/requireAuth";
import { wrap } from "../lib/asyncHandler";

export const authRouter = Router();

function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

authRouter.post("/request-otp", async (req, res, next) => {
  try {
    const { email } = requestOtpSchema.parse(req.body);
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

    const existing = await authStorage.findUserByEmail(email);
    if (existing) {
      const token = signSessionToken({ userId: existing.id, email: existing.email });
      res.json({ isNewUser: false, token, user: existing });
      return;
    }

    res.json({ isNewUser: true, signupToken: signSignupToken(email) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

authRouter.post("/complete-signup", async (req, res, next) => {
  try {
    const { email, username, signupToken } = completeSignupSchema.parse(req.body);
    if (!verifySignupToken(signupToken, email)) {
      res.status(400).json({ error: "Verification expired — please request a new code" });
      return;
    }
    const existing = await authStorage.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const user = await authStorage.createUser(email, username);
    const token = signSessionToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: zodErrorMessage(error) });
      return;
    }
    next(error);
  }
});

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
