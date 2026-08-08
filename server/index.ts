import "dotenv/config";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes/index";

const app = express();
const isDev = process.env.NODE_ENV === "development";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isDev) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || "Internal Server Error" });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`KitchenPlanner API listening on port ${port}`);
  });
})();
