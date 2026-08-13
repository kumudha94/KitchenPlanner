import "dotenv/config";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes/index";
import { ensureSchema } from "./db";

// Backstop for any promise rejection that isn't caught by a route handler or
// forwarded via next(). Without this, Node's default behavior
// (--unhandled-rejections=throw) crashes the process — a real risk on
// Neon/Render free tier, where DB cold-starts and pool exhaustion are
// expected, not rare.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const app = express();

// Auth is bearer-token (Authorization header), not cookie/session-based, so
// there's no ambient credential a cross-origin page could ride on — allowing
// any origin doesn't add a CSRF-style risk here. Restricting origins would
// only block legitimate clients (the mobile app has no origin at all; the
// web preview build needs its dev-server origin allowed) without reducing
// any actual attack surface.
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

(async () => {
  try {
    await ensureSchema();
  } catch (err) {
    // Best-effort, idempotent sync — a transient failure here (e.g. this
    // dev environment's flaky direct connection to Neon) shouldn't prevent
    // the server from starting when the schema is already correct from a
    // prior successful run elsewhere (the deployed instance, most likely).
    console.warn("ensureSchema failed, continuing without it:", err);
  }
  const server = await registerRoutes(app);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      // Unexpected/internal errors (DB outages, raw Postgres errors, etc.) —
      // log the real error server-side but don't leak internals to the client.
      console.error(err);
      res.status(status).json({ error: "Internal Server Error" });
      return;
    }
    res.status(status).json({ error: err.message || "Bad Request" });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`KitchenPlanner API listening on port ${port}`);
  });
})();
