# KitchenPlanner Foundation + Recipes + Meal Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the KitchenPlanner backend + mobile app scaffold, and ship the first two working modules: a reusable Recipe library and a weekly/monthly Meal Planner that assigns recipes to breakfast/lunch/snack/dinner slots.

**Architecture:** Express REST API (Node/TypeScript) backed by PostgreSQL via Drizzle ORM, consumed by an Expo React Native app using React Navigation (bottom tabs + per-tab native stacks) and TanStack React Query for data fetching. Single-user, no auth — mirrors the existing FinanceTracker project's stack and conventions.

**Tech Stack:** Express 4, Drizzle ORM (`drizzle-orm/node-postgres` + `pg`), drizzle-zod, Zod, Expo SDK 50, React Navigation 6, TanStack React Query 5.

## Global Constraints

- No authentication, login, or per-request user identity — every table and endpoint is global to the single deployment (per spec: `docs/superpowers/specs/2026-08-08-kitchen-planner-design.md`).
- Backend and mobile app are decoupled from any pantry/inventory concept — out of scope per spec.
- Dates for meal planning are plain `YYYY-MM-DD` strings, not timestamps (avoids timezone bugs on a calendar-day concept).
- Deleting a Recipe must not break existing Meal Planner entries that reference it — the entry keeps a denormalized `recipeNameSnapshot`.
- This plan covers only the Recipes and Meal Planner modules. Grocery Lists and Prep Log are separate modules (per spec, intentionally data-independent) and will be planned in their own follow-up plan documents once this one ships.

---

## File Structure

**Backend** (repo root `/home/kgd122/personal/KitchenPlanner`):
- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `drizzle.config.ts` — project config
- `server/db.ts` — Drizzle + pg Pool connection
- `server/index.ts` — Express app bootstrap
- `server/routes/index.ts` — route aggregator, mounts each module's router, health check
- `server/routes/recipes.ts` — Recipes REST endpoints
- `server/routes/mealPlanner.ts` — Meal Planner REST endpoints
- `server/storage/recipes.ts` — Recipes DB access functions
- `server/storage/mealPlanner.ts` — Meal Planner DB access functions
- `shared/schema.ts` — Drizzle table definitions + Zod insert schemas + types (shared type source for both future backend and any code generation)

**Mobile** (`mobile/`):
- `package.json`, `app.json`, `babel.config.js`, `index.js`, `tsconfig.json` — project config
- `App.tsx` — navigation shell (bottom tabs, per-tab stacks)
- `src/lib/api.ts` — fetch wrapper
- `src/lib/types.ts` — TypeScript types mirroring `shared/schema.ts`
- `src/screens/RecipesScreen.tsx`, `src/screens/AddEditRecipeScreen.tsx` — Recipes module UI
- `src/screens/PlannerScreen.tsx`, `src/screens/SlotEditorScreen.tsx` — Meal Planner module UI
- `src/screens/GroceryScreen.tsx`, `src/screens/PrepLogScreen.tsx` — placeholder screens, replaced by their own plans

---

### Task 1: Backend project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `drizzle.config.ts`
- Create: `server/db.ts`
- Create: `server/index.ts`
- Create: `server/routes/index.ts`
- Create: `README.md`

**Interfaces:**
- Produces: `db` (Drizzle instance) exported from `server/db.ts`, imported by every future `server/storage/*.ts` file as `import { db } from "../db"`.
- Produces: `registerRoutes(app: Express): Promise<Server>` exported from `server/routes/index.ts`, called once from `server/index.ts`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "kitchen-planner-server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "express": "^4.21.2",
    "pg": "^8.13.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/pg": "^8.11.10",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "tsx": "^4.20.5",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "include": ["shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node"],
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

- [ ] **Step 3: Create `.env.example`**

```text
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
PORT=5000
```

- [ ] **Step 4: Create `.gitignore`**

```text
node_modules/
dist/
.env
*.log
.expo/
mobile/node_modules/
mobile/.expo/
```

- [ ] **Step 5: Create `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

- [ ] **Step 6: Create `server/db.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
```

- [ ] **Step 7: Create `server/routes/index.ts`**

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return createServer(app);
}
```

- [ ] **Step 8: Create `server/index.ts`**

```ts
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
```

- [ ] **Step 9: Create `README.md`**

```markdown
# KitchenPlanner

Personal meal planning, recipe library, grocery lists, and cooking prep journal.

## Backend setup

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres connection string (a Neon project works, same as FinanceTracker).
3. `npm run db:push` to create tables from `shared/schema.ts`.
4. `npm run dev` — starts the API on port 5000.

## Mobile setup

1. `cd mobile && npm install`
2. Set `EXPO_PUBLIC_API_URL` in `mobile/.env` if the backend isn't on `http://localhost:5000`.
3. `npx expo start`
```

- [ ] **Step 10: Install dependencies and verify the server boots**

Run:
```bash
npm install
cp .env.example .env
```

Edit `.env` and set a real `DATABASE_URL` (a Neon Postgres connection string). Then run:

```bash
npm run dev
```

Expected: console prints `KitchenPlanner API listening on port 5000` with no errors.

In a second terminal:
```bash
curl -s http://localhost:5000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore drizzle.config.ts server README.md
git commit -m "Scaffold KitchenPlanner backend with health check endpoint"
```

---

### Task 2: Recipes module (schema, storage, routes)

**Files:**
- Create: `shared/schema.ts`
- Create: `server/storage/recipes.ts`
- Create: `server/routes/recipes.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `db` from `server/db.ts` (Task 1).
- Produces: `recipes` table, `insertRecipeSchema`, `type Recipe`, `type InsertRecipe` from `shared/schema.ts` — consumed by Task 3 (`recipeId` foreign key) and Task 5 (mobile types mirror these).
- Produces: `recipesRouter` (Express Router) mounted at `/api/recipes`.

- [ ] **Step 1: Create `shared/schema.ts` with the recipes table**

```ts
import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type RecipeIngredient = { name: string; quantity: string };

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  mealType: varchar("meal_type", { length: 20 }),
  ingredients: jsonb("ingredients").notNull().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecipeSchema = createInsertSchema(recipes)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().min(1, "Recipe name is required"),
    mealType: z.enum(MEAL_TYPES).optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.string().min(1),
        })
      )
      .default([]),
    notes: z.string().optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = Omit<typeof recipes.$inferSelect, "ingredients"> & {
  ingredients: RecipeIngredient[];
};
```

- [ ] **Step 2: Create `server/storage/recipes.ts`**

```ts
import { db } from "../db";
import { recipes, type InsertRecipe, type Recipe } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await db.select().from(recipes).orderBy(recipes.name);
  return rows as Recipe[];
}

export async function getRecipe(id: number): Promise<Recipe | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
  return recipe as Recipe | undefined;
}

export async function createRecipe(data: InsertRecipe): Promise<Recipe> {
  const [recipe] = await db.insert(recipes).values(data).returning();
  return recipe as Recipe;
}

export async function updateRecipe(id: number, data: Partial<InsertRecipe>): Promise<Recipe | undefined> {
  const [recipe] = await db
    .update(recipes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning();
  return recipe as Recipe | undefined;
}

export async function deleteRecipe(id: number): Promise<boolean> {
  const result = await db.delete(recipes).where(eq(recipes.id, id)).returning({ id: recipes.id });
  return result.length > 0;
}
```

- [ ] **Step 3: Create `server/routes/recipes.ts`**

```ts
import { Router } from "express";
import { insertRecipeSchema } from "@shared/schema";
import * as recipeStorage from "../storage/recipes";

export const recipesRouter = Router();

recipesRouter.get("/", async (_req, res) => {
  res.json(await recipeStorage.listRecipes());
});

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await recipeStorage.getRecipe(Number(req.params.id));
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(recipe);
});

recipesRouter.post("/", async (req, res) => {
  try {
    const data = insertRecipeSchema.parse(req.body);
    const recipe = await recipeStorage.createRecipe(data);
    res.status(201).json(recipe);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid recipe data" });
  }
});

recipesRouter.patch("/:id", async (req, res) => {
  try {
    const data = insertRecipeSchema.partial().parse(req.body);
    const recipe = await recipeStorage.updateRecipe(Number(req.params.id), data);
    if (!recipe) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(recipe);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid recipe data" });
  }
});

recipesRouter.delete("/:id", async (req, res) => {
  const deleted = await recipeStorage.deleteRecipe(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.status(204).send();
});
```

- [ ] **Step 4: Wire the router into `server/routes/index.ts`**

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { recipesRouter } from "./recipes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/recipes", recipesRouter);

  return createServer(app);
}
```

- [ ] **Step 5: Push the schema to the database**

Run: `npm run db:push`
Expected: drizzle-kit reports the `recipes` table created, no errors.

- [ ] **Step 6: Verify the CRUD flow manually**

Start the server (`npm run dev` in one terminal), then in another:

```bash
curl -s -X POST http://localhost:5000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"name":"Poha","mealType":"breakfast","ingredients":[{"name":"Rice flakes","quantity":"200g"},{"name":"Onion","quantity":"1"}],"notes":"Add peanuts"}'
```
Expected: 201 with the created recipe including a numeric `id`.

```bash
curl -s http://localhost:5000/api/recipes
```
Expected: JSON array containing the Poha recipe.

```bash
curl -s -X PATCH http://localhost:5000/api/recipes/1 -H "Content-Type: application/json" -d '{"notes":"Add peanuts and curry leaves"}'
```
Expected: 200 with updated `notes`.

```bash
curl -s -X DELETE http://localhost:5000/api/recipes/1 -o /dev/null -w "%{http_code}\n"
```
Expected: `204`

- [ ] **Step 7: Commit**

```bash
git add shared/schema.ts server/storage/recipes.ts server/routes/recipes.ts server/routes/index.ts
git commit -m "Add Recipes module: schema, storage, and REST endpoints"
```

---

### Task 3: Meal Planner module (schema, storage, routes)

**Files:**
- Modify: `shared/schema.ts`
- Create: `server/storage/mealPlanner.ts`
- Create: `server/routes/mealPlanner.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `recipes` table and `MealType`/`MEAL_TYPES` from `shared/schema.ts` (Task 2).
- Produces: `mealPlanEntries` table, `type MealPlanEntry` from `shared/schema.ts`.
- Produces: `mealPlannerRouter` mounted at `/api/meal-plan` — `GET /?start&end`, `PUT /:date/:slot`, `DELETE /:date/:slot`.

- [ ] **Step 1: Add the `mealPlanEntries` table to `shared/schema.ts`**

In the existing top-of-file import from `"drizzle-orm/pg-core"`, replace:
```ts
import { pgTable, serial, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
```
with:
```ts
import { pgTable, serial, varchar, text, timestamp, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
```

Then append this to the end of `shared/schema.ts`:

```ts
export const mealPlanEntries = pgTable(
  "meal_plan_entries",
  {
    id: serial("id").primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    slot: varchar("slot", { length: 20 }).notNull(),
    recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    recipeNameSnapshot: varchar("recipe_name_snapshot", { length: 150 }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dateSlotIdx: uniqueIndex("meal_plan_date_slot_idx").on(table.date, table.slot),
  })
);

export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
```

- [ ] **Step 2: Create `server/storage/mealPlanner.ts`**

```ts
import { db } from "../db";
import { mealPlanEntries, recipes, type MealPlanEntry } from "@shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export type SlotUpdate = {
  recipeId?: number | null;
  note?: string | null;
};

export async function getWeek(startDate: string, endDate: string): Promise<MealPlanEntry[]> {
  return db
    .select()
    .from(mealPlanEntries)
    .where(and(gte(mealPlanEntries.date, startDate), lte(mealPlanEntries.date, endDate)))
    .orderBy(mealPlanEntries.date);
}

export async function upsertSlot(date: string, slot: string, update: SlotUpdate): Promise<MealPlanEntry> {
  let recipeNameSnapshot: string | null = null;
  if (update.recipeId) {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, update.recipeId));
    recipeNameSnapshot = recipe?.name ?? null;
  }

  const [entry] = await db
    .insert(mealPlanEntries)
    .values({
      date,
      slot,
      recipeId: update.recipeId ?? null,
      recipeNameSnapshot,
      note: update.note ?? null,
    })
    .onConflictDoUpdate({
      target: [mealPlanEntries.date, mealPlanEntries.slot],
      set: {
        recipeId: update.recipeId ?? null,
        recipeNameSnapshot,
        note: update.note ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return entry;
}

export async function clearSlot(date: string, slot: string): Promise<boolean> {
  const result = await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.date, date), eq(mealPlanEntries.slot, slot)))
    .returning({ id: mealPlanEntries.id });
  return result.length > 0;
}
```

- [ ] **Step 3: Create `server/routes/mealPlanner.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import * as mealPlanStorage from "../storage/mealPlanner";

export const mealPlannerRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const slotUpdateSchema = z.object({
  recipeId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

mealPlannerRouter.get("/", async (req, res) => {
  const start = String(req.query.start || "");
  const end = String(req.query.end || "");
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    res.status(400).json({ error: "start and end query params must be YYYY-MM-DD" });
    return;
  }
  res.json(await mealPlanStorage.getWeek(start, end));
});

mealPlannerRouter.put("/:date/:slot", async (req, res) => {
  if (!dateRegex.test(req.params.date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  try {
    const update = slotUpdateSchema.parse(req.body);
    const entry = await mealPlanStorage.upsertSlot(req.params.date, req.params.slot, update);
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid meal plan data" });
  }
});

mealPlannerRouter.delete("/:date/:slot", async (req, res) => {
  const deleted = await mealPlanStorage.clearSlot(req.params.date, req.params.slot);
  if (!deleted) {
    res.status(404).json({ error: "Slot is already empty" });
    return;
  }
  res.status(204).send();
});
```

- [ ] **Step 4: Wire the router into `server/routes/index.ts`**

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { recipesRouter } from "./recipes";
import { mealPlannerRouter } from "./mealPlanner";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/recipes", recipesRouter);
  app.use("/api/meal-plan", mealPlannerRouter);

  return createServer(app);
}
```

- [ ] **Step 5: Push the schema and restart the server**

Run: `npm run db:push`
Expected: drizzle-kit reports the `meal_plan_entries` table created.

Restart `npm run dev`.

- [ ] **Step 6: Verify the plan + recipe-deletion snapshot behavior manually**

```bash
curl -s -X POST http://localhost:5000/api/recipes -H "Content-Type: application/json" \
  -d '{"name":"Dal Rice","ingredients":[{"name":"Toor dal","quantity":"200g"}]}'
```
Note the returned `id` (call it `RID`).

```bash
curl -s -X PUT http://localhost:5000/api/meal-plan/2026-08-10/lunch -H "Content-Type: application/json" \
  -d '{"recipeId": RID}'
```
Expected: 200, response includes `"recipeNameSnapshot":"Dal Rice"`.

```bash
curl -s "http://localhost:5000/api/meal-plan?start=2026-08-10&end=2026-08-16"
```
Expected: array containing the Monday lunch entry.

```bash
curl -s -X DELETE http://localhost:5000/api/recipes/RID -o /dev/null -w "%{http_code}\n"
curl -s "http://localhost:5000/api/meal-plan?start=2026-08-10&end=2026-08-16"
```
Expected: the plan entry is still present, `recipeId` is now `null`, but `recipeNameSnapshot` still reads `"Dal Rice"`.

```bash
curl -s -X DELETE http://localhost:5000/api/meal-plan/2026-08-10/lunch -o /dev/null -w "%{http_code}\n"
```
Expected: `204`

- [ ] **Step 7: Commit**

```bash
git add shared/schema.ts server/storage/mealPlanner.ts server/routes/mealPlanner.ts server/routes/index.ts
git commit -m "Add Meal Planner module with recipe-deletion-safe snapshotting"
```

---

### Task 4: Mobile app scaffold with navigation shell

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/babel.config.js`
- Create: `mobile/index.js`
- Create: `mobile/tsconfig.json`
- Create: `mobile/.env.example`
- Create: `mobile/App.tsx`
- Create: `mobile/src/lib/api.ts`
- Create: `mobile/src/lib/types.ts`
- Create: `mobile/src/screens/RecipesScreen.tsx` (placeholder)
- Create: `mobile/src/screens/PlannerScreen.tsx` (placeholder)
- Create: `mobile/src/screens/GroceryScreen.tsx` (placeholder)
- Create: `mobile/src/screens/PrepLogScreen.tsx` (placeholder)

**Interfaces:**
- Produces: `apiRequest<T>(endpoint, options?)` from `src/lib/api.ts` — consumed by every screen added in Tasks 5–6 and future Grocery/Prep Log plans.
- Produces: `Recipe`, `InsertRecipe`, `RecipeIngredient`, `MealSlot`, `MealPlanEntry` types from `src/lib/types.ts`.
- Produces: `TabParamList` exported from `App.tsx`.

- [ ] **Step 1: Create `mobile/package.json`**

```json
{
  "name": "kitchen-planner-mobile",
  "version": "1.0.0",
  "main": "index.js",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.11.0",
    "@tanstack/react-query": "^5.60.5",
    "date-fns": "^3.6.0",
    "expo": "~50.0.17",
    "expo-status-bar": "~1.11.1",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "babel-preset-expo": "~10.0.1",
    "typescript": "^5.1.3"
  },
  "overrides": {
    "react": "18.2.0"
  }
}
```

- [ ] **Step 2: Create `mobile/app.json`**

```json
{
  "expo": {
    "name": "KitchenPlanner",
    "slug": "kitchen-planner",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.kitchenplanner.app"
    }
  }
}
```

- [ ] **Step 3: Create `mobile/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

- [ ] **Step 4: Create `mobile/index.js`**

```js
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
```

- [ ] **Step 5: Create `mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 6: Create `mobile/.env.example`**

```text
EXPO_PUBLIC_API_URL=http://localhost:5000
```

- [ ] **Step 7: Create `mobile/src/lib/api.ts`**

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `API error ${response.status}`;
    try {
      message = JSON.parse(text).error || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
```

- [ ] **Step 8: Create `mobile/src/lib/types.ts`**

```ts
export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
export type MealSlot = MealType;

export type RecipeIngredient = { name: string; quantity: string };

export type Recipe = {
  id: number;
  name: string;
  mealType: MealType | null;
  ingredients: RecipeIngredient[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsertRecipe = {
  name: string;
  mealType?: MealType;
  ingredients: RecipeIngredient[];
  notes?: string;
};

export type MealPlanEntry = {
  id: number;
  date: string;
  slot: MealSlot;
  recipeId: number | null;
  recipeNameSnapshot: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 9: Create placeholder screens**

`mobile/src/screens/RecipesScreen.tsx`:
```tsx
import { View, Text, StyleSheet } from "react-native";

export default function RecipesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Recipes coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
```

`mobile/src/screens/PlannerScreen.tsx`:
```tsx
import { View, Text, StyleSheet } from "react-native";

export default function PlannerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Planner coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
```

`mobile/src/screens/GroceryScreen.tsx`:
```tsx
import { View, Text, StyleSheet } from "react-native";

export default function GroceryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Grocery lists coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
```

`mobile/src/screens/PrepLogScreen.tsx`:
```tsx
import { View, Text, StyleSheet } from "react-native";

export default function PrepLogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Prep log coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
```

- [ ] **Step 10: Create `mobile/App.tsx`**

```tsx
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import RecipesScreen from "./src/screens/RecipesScreen";
import PlannerScreen from "./src/screens/PlannerScreen";
import GroceryScreen from "./src/screens/GroceryScreen";
import PrepLogScreen from "./src/screens/PrepLogScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

export type TabParamList = {
  Planner: undefined;
  Recipes: undefined;
  Grocery: undefined;
  PrepLog: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";
          if (route.name === "Planner") iconName = focused ? "calendar" : "calendar-outline";
          else if (route.name === "Recipes") iconName = focused ? "book" : "book-outline";
          else if (route.name === "Grocery") iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "PrepLog") iconName = focused ? "journal" : "journal-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2E7D32",
        headerStyle: { backgroundColor: "#2E7D32" },
        headerTintColor: "#fff",
      })}
    >
      <Tab.Screen name="Planner" component={PlannerScreen} options={{ title: "Planner" }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Recipes" }} />
      <Tab.Screen name="Grocery" component={GroceryScreen} options={{ title: "Grocery" }} />
      <Tab.Screen name="PrepLog" component={PrepLogScreen} options={{ title: "Prep Log" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <TabNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 11: Install and verify the app launches**

Run:
```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Expected: Expo dev server starts; opening the app (Expo Go or emulator) shows 4 bottom tabs (Planner, Recipes, Grocery, Prep Log), each showing its "coming soon" placeholder text, and switching tabs works.

- [ ] **Step 12: Commit**

```bash
git add mobile/package.json mobile/app.json mobile/babel.config.js mobile/index.js mobile/tsconfig.json mobile/.env.example mobile/App.tsx mobile/src
git commit -m "Scaffold KitchenPlanner mobile app with tab navigation shell"
```

---

### Task 5: Mobile Recipes screens

**Files:**
- Create: `mobile/src/screens/RecipesScreen.tsx` (replaces placeholder)
- Create: `mobile/src/screens/AddEditRecipeScreen.tsx`
- Modify: `mobile/App.tsx`

**Interfaces:**
- Consumes: `apiRequest`, `Recipe`, `InsertRecipe`, `RecipeIngredient` from `src/lib/*` (Task 4); `/api/recipes` endpoints (Task 2).
- Produces: `RecipesStackParamList` exported from `App.tsx`, consumed by both screens in this task.

- [ ] **Step 1: Rewrite `mobile/src/screens/RecipesScreen.tsx`**

```tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { Recipe } from "../lib/types";
import type { RecipesStackParamList } from "../../App";

type Props = NativeStackScreenProps<RecipesStackParamList, "RecipesList">;

export default function RecipesScreen({ navigation }: Props) {
  const {
    data: recipes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No recipes yet — add your first one</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("AddEditRecipe", { recipeId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.mealType ? <Text style={styles.rowSubtitle}>{item.mealType}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AddEditRecipe", {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#888", marginTop: 2, textTransform: "capitalize" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
```

- [ ] **Step 2: Create `mobile/src/screens/AddEditRecipeScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { InsertRecipe, Recipe, RecipeIngredient, MealType } from "../lib/types";
import type { RecipesStackParamList } from "../../App";

type Props = NativeStackScreenProps<RecipesStackParamList, "AddEditRecipe">;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function AddEditRecipeScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const isEdit = recipeId !== undefined;
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => apiRequest<Recipe>(`/api/recipes/${recipeId}`),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ name: "", quantity: "" }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setMealType(existing.mealType ?? undefined);
      setIngredients(existing.ingredients.length ? existing.ingredients : [{ name: "", quantity: "" }]);
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? "Edit Recipe" : "Add Recipe" });
  }, [isEdit]);

  const saveMutation = useMutation({
    mutationFn: (data: InsertRecipe) =>
      isEdit
        ? apiRequest<Recipe>(`/api/recipes/${recipeId}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiRequest<Recipe>("/api/recipes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not save recipe", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/api/recipes/${recipeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not delete recipe", error.message),
  });

  function handleSave() {
    if (!name.trim()) {
      Alert.alert("Recipe name is required");
      return;
    }
    const cleanIngredients = ingredients.filter((i) => i.name.trim().length > 0);
    saveMutation.mutate({
      name: name.trim(),
      mealType,
      ingredients: cleanIngredients,
      notes: notes.trim() || undefined,
    });
  }

  function updateIngredient(index: number, field: "name" | "quantity", value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Poha" />

      <Text style={styles.label}>Meal type</Text>
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, mealType === type && styles.chipActive]}
            onPress={() => setMealType(mealType === type ? undefined : type)}
          >
            <Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ingredients</Text>
      {ingredients.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            style={[styles.input, { flex: 2, marginRight: 8 }]}
            value={ing.name}
            onChangeText={(v) => updateIngredient(index, "name", v)}
            placeholder="Ingredient"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={ing.quantity}
            onChangeText={(v) => updateIngredient(index, "quantity", v)}
            placeholder="Qty"
          />
          <TouchableOpacity onPress={() => removeIngredientRow(index)}>
            <Ionicons name="close-circle" size={22} color="#c00" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addIngredientRow} style={styles.addRow}>
        <Ionicons name="add-circle-outline" size={20} color="#2E7D32" />
        <Text style={styles.addRowText}>Add ingredient</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? "Saving..." : "Save Recipe"}</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            Alert.alert("Delete recipe?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Text style={styles.deleteButtonText}>Delete Recipe</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  chipText: { fontSize: 13, color: "#555", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  ingredientRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  addRowText: { color: "#2E7D32", marginLeft: 6, fontSize: 14 },
  saveButton: { backgroundColor: "#2E7D32", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  deleteButton: { alignItems: "center", marginTop: 16, marginBottom: 32 },
  deleteButtonText: { color: "#c00", fontSize: 14 },
});
```

- [ ] **Step 3: Modify `mobile/App.tsx` to wrap Recipes in its own stack**

Add these imports near the top (after the existing screen imports):
```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AddEditRecipeScreen from "./src/screens/AddEditRecipeScreen";
```

Add this type export and stack navigator, placed above `const Tab = createBottomTabNavigator<TabParamList>();`:
```tsx
export type RecipesStackParamList = {
  RecipesList: undefined;
  AddEditRecipe: { recipeId?: number };
};

const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();

function RecipesStackNavigator() {
  return (
    <RecipesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#2E7D32" },
        headerTintColor: "#fff",
      }}
    >
      <RecipesStack.Screen name="RecipesList" component={RecipesScreen} options={{ title: "Recipes" }} />
      <RecipesStack.Screen name="AddEditRecipe" component={AddEditRecipeScreen} />
    </RecipesStack.Navigator>
  );
}
```

In `TabNavigator`, replace:
```tsx
<Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Recipes" }} />
```
with:
```tsx
<Tab.Screen name="Recipes" component={RecipesStackNavigator} options={{ title: "Recipes", headerShown: false }} />
```

- [ ] **Step 4: Verify in the running app**

With the backend running (`npm run dev` in repo root) and `npx expo start` running in `mobile/`:
1. Open the Recipes tab — should show the empty state ("No recipes yet — add your first one").
2. Tap the `+` FAB, fill in name "Poha", meal type "breakfast", one ingredient row ("Rice flakes", "200g"), save.
3. Expect to land back on the list showing "Poha".
4. Tap "Poha", change the notes field, save — confirm the update persists after tab switch + return.
5. Tap "Poha" again, tap "Delete Recipe", confirm — list returns to the empty state.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/RecipesScreen.tsx mobile/src/screens/AddEditRecipeScreen.tsx mobile/App.tsx
git commit -m "Add Recipes list, add/edit, and delete screens to mobile app"
```

---

### Task 6: Mobile Meal Planner screens

**Files:**
- Create: `mobile/src/screens/PlannerScreen.tsx` (replaces placeholder)
- Create: `mobile/src/screens/SlotEditorScreen.tsx`
- Modify: `mobile/App.tsx`

**Interfaces:**
- Consumes: `apiRequest`, `MealPlanEntry`, `MealSlot`, `Recipe` from `src/lib/*`; `/api/meal-plan` and `/api/recipes` endpoints; `date-fns` (already a dependency from Task 4).
- Produces: `PlannerStackParamList` exported from `App.tsx`.

- [ ] **Step 1: Create `mobile/src/screens/PlannerScreen.tsx`**

```tsx
import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, format, startOfWeek, addDays } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealSlot } from "../lib/types";
import type { PlannerStackParamList } from "../../App";

type Props = NativeStackScreenProps<PlannerStackParamList, "PlannerWeek">;

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export default function PlannerScreen({ navigation }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset]
  );
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const startDate = format(days[0], "yyyy-MM-dd");
  const endDate = format(days[6], "yyyy-MM-dd");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["meal-plan", startDate, endDate],
    queryFn: () => apiRequest<MealPlanEntry[]>(`/api/meal-plan?start=${startDate}&end=${endDate}`),
  });

  function entryFor(date: string, slot: MealSlot) {
    return entries?.find((e) => e.date === date && e.slot === slot);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekHeader}>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)}>
          <Ionicons name="chevron-back" size={22} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {format(days[0], "MMM d")} - {format(days[6], "MMM d")}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)}>
          <Ionicons name="chevron-forward" size={22} color="#2E7D32" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <View key={dateStr} style={styles.dayBlock}>
              <Text style={styles.dayLabel}>{format(day, "EEEE, MMM d")}</Text>
              {SLOTS.map((slot) => {
                const entry = entryFor(dateStr, slot);
                const displayText = entry?.recipeNameSnapshot || entry?.note || "+ Add";
                return (
                  <TouchableOpacity
                    key={slot}
                    style={styles.slotRow}
                    onPress={() => navigation.navigate("SlotEditor", { date: dateStr, slot })}
                  >
                    <Text style={styles.slotName}>{slot}</Text>
                    <Text style={entry ? styles.slotValue : styles.slotEmpty}>{displayText}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  weekLabel: { fontSize: 15, fontWeight: "600" },
  dayBlock: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 8, borderBottomColor: "#f5f5f5" },
  dayLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: "#333" },
  slotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  slotName: { fontSize: 13, color: "#888", textTransform: "capitalize", width: 90 },
  slotValue: { fontSize: 14, color: "#222", flex: 1, textAlign: "right" },
  slotEmpty: { fontSize: 14, color: "#aaa", flex: 1, textAlign: "right" },
});
```

- [ ] **Step 2: Create `mobile/src/screens/SlotEditorScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, Recipe } from "../lib/types";
import type { PlannerStackParamList } from "../../App";

type Props = NativeStackScreenProps<PlannerStackParamList, "SlotEditor">;

export default function SlotEditorScreen({ route, navigation }: Props) {
  const { date, slot } = route.params;
  const queryClient = useQueryClient();

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  const [note, setNote] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `${slot[0].toUpperCase()}${slot.slice(1)} · ${date}` });
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<MealPlanEntry>(`/api/meal-plan/${date}/${slot}`, {
        method: "PUT",
        body: JSON.stringify({ recipeId: selectedRecipeId, note: note.trim() || undefined }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not save", error.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/api/meal-plan/${date}/${slot}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pick a recipe</Text>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        style={{ maxHeight: 260 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.recipeRow, selectedRecipeId === item.id && styles.recipeRowActive]}
            onPress={() => setSelectedRecipeId(selectedRecipeId === item.id ? null : item.id)}
          >
            <Text style={styles.recipeRowText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No recipes yet — add one in the Recipes tab</Text>}
      />

      <Text style={styles.label}>Or just a note</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Leftovers" />

      <TouchableOpacity style={styles.saveButton} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearButton} onPress={() => clearMutation.mutate()}>
        <Text style={styles.clearButtonText}>Clear this slot</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 12, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#999" },
  recipeRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6, backgroundColor: "#f7f7f7" },
  recipeRowActive: { backgroundColor: "#c8e6c9" },
  recipeRowText: { fontSize: 15 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  saveButton: { backgroundColor: "#2E7D32", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  clearButton: { alignItems: "center", marginTop: 16 },
  clearButtonText: { color: "#c00", fontSize: 14 },
});
```

- [ ] **Step 3: Modify `mobile/App.tsx` to wrap Planner in its own stack**

Add these imports near the top (after the Task 5 imports):
```tsx
import SlotEditorScreen from "./src/screens/SlotEditorScreen";
import type { MealSlot } from "./src/lib/types";
```

Add this type export and stack navigator, placed right after the `RecipesStackNavigator` function from Task 5:
```tsx
export type PlannerStackParamList = {
  PlannerWeek: undefined;
  SlotEditor: { date: string; slot: MealSlot };
};

const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();

function PlannerStackNavigator() {
  return (
    <PlannerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#2E7D32" },
        headerTintColor: "#fff",
      }}
    >
      <PlannerStack.Screen name="PlannerWeek" component={PlannerScreen} options={{ title: "Planner" }} />
      <PlannerStack.Screen name="SlotEditor" component={SlotEditorScreen} options={{ presentation: "modal" }} />
    </PlannerStack.Navigator>
  );
}
```

In `TabNavigator`, replace:
```tsx
<Tab.Screen name="Planner" component={PlannerScreen} options={{ title: "Planner" }} />
```
with:
```tsx
<Tab.Screen name="Planner" component={PlannerStackNavigator} options={{ title: "Planner", headerShown: false }} />
```

- [ ] **Step 4: Verify in the running app**

With backend and Expo both running, and at least one recipe already added (from Task 5's verification):
1. Open the Planner tab — should show the current week, Monday through Sunday, each with 4 empty slots reading "+ Add".
2. Tap Monday's "lunch" slot, select a recipe from the list, save — back on the week view, Monday lunch should now show that recipe's name.
3. Tap the same slot again, tap "Clear this slot" — it should revert to "+ Add".
4. Tap a slot, type a freeform note instead of picking a recipe, save — the week view should display the note text.
5. Use the arrow buttons to navigate to next/previous week and confirm the view updates and previously-saved entries don't leak into other weeks.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/PlannerScreen.tsx mobile/src/screens/SlotEditorScreen.tsx mobile/App.tsx
git commit -m "Add Meal Planner week view and slot editor screens to mobile app"
```

---

## Self-Review Notes

- **Spec coverage:** Recipes (library CRUD) ✅ Task 2/5. Meal Planner (calendar slots, recipe picker, denormalized snapshot on delete) ✅ Task 3/6. Backend/mobile architecture, single-user/no-auth, Expo+Express+Postgres stack ✅ Task 1/4. Grocery Lists and Prep Log are explicitly deferred to their own plans (noted in Global Constraints), matching the spec's stated module independence.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code or exact shell commands.
- **Type consistency:** `Recipe`/`InsertRecipe`/`RecipeIngredient` (Task 2 backend, Task 4 mobile) and `MealPlanEntry`/`MealSlot` (Task 3 backend, Task 4/6 mobile) use matching field names and shapes across backend and mobile. `RecipesStackParamList` and `PlannerStackParamList` are defined once (Tasks 5 and 6 respectively) and consumed consistently by their own screens.
