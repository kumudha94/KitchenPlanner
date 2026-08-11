import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set.");
}
const JWT_SECRET = process.env.JWT_SECRET;

const SESSION_EXPIRY = "90d";
const SIGNUP_TOKEN_EXPIRY = "15m";

export type SessionPayload = { userId: number; email: string };
export type SignupTokenPayload = { email: string; purpose: "signup" };

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

// Short-lived token proving an email's OTP was just verified, so
// complete-signup can't be called for an email that never went through
// the OTP step.
export function signSignupToken(email: string): string {
  return jwt.sign({ email, purpose: "signup" } satisfies SignupTokenPayload, JWT_SECRET, {
    expiresIn: SIGNUP_TOKEN_EXPIRY,
  });
}

export function verifySignupToken(token: string, email: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SignupTokenPayload;
    return payload.purpose === "signup" && payload.email === email;
  } catch {
    return false;
  }
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
