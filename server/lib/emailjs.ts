// Sends the OTP email via EmailJS's REST API (server-side, using the
// private key — not the browser SDK, so the key never reaches the client).
// Requires EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY,
// EMAILJS_PRIVATE_KEY. Template variables: {{email}} (To Email), {{otp}},
// {{time}} (expiry, formatted as a local time string).

const isEmailjsConfigured = !!(
  process.env.EMAILJS_SERVICE_ID &&
  process.env.EMAILJS_TEMPLATE_ID &&
  process.env.EMAILJS_PUBLIC_KEY &&
  process.env.EMAILJS_PRIVATE_KEY
);

if (!isEmailjsConfigured) {
  console.warn(
    "⚠️  EmailJS is not configured (EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY / EMAILJS_PRIVATE_KEY). " +
      "OTP emails will fail to send until these are set."
  );
}

export async function sendOtpEmail(email: string, code: string, expiresAt: Date): Promise<void> {
  // The server runs in UTC (Render), but the app is for an IST user —
  // without an explicit timeZone, toLocaleTimeString uses the server's
  // zone, showing a time hours off from what the recipient actually sees
  // on their clock.
  const expiryTime = expiresAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  if (!isEmailjsConfigured) {
    // Logged server-side only, never returned to the client — lets auth be
    // tested end-to-end before EmailJS is wired up, without ever exposing a
    // code over the API.
    console.warn(`[dev] EmailJS not configured — OTP for ${email} is ${code} (expires ${expiryTime})`);
    return;
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        email,
        otp: code,
        time: expiryTime,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EmailJS send failed (${response.status}): ${text}`);
  }
}
