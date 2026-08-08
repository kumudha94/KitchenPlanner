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
