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

// No session/cookie-based auth exists in this app (single-user, no login),
// so there's no credentialed cross-origin request to protect against —
// restricting origins here would only block legitimate clients (the mobile
// app has no origin at all; the web preview build needs its dev-server
// origin allowed) without reducing any actual attack surface.
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
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
  await ensureSchema();
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
