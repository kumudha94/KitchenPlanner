# KitchenPlanner — Design Spec

**Date:** 2026-08-08
**Status:** Approved by user, ready for planning

## Purpose

A personal, single-user mobile app for managing home cooking: planning meals across breakfast/lunch/snack/dinner, maintaining a reusable recipe library, tracking weekly (perishables) and monthly (staples/household) grocery lists, and keeping a cooking journal (prep log) of what was actually made and what ingredients were used.

This is a companion app to the user's existing [FinanceTracker](../../../FinanceTracker) project and intentionally reuses its architecture and dev workflow.

## Scope

Single user, no authentication/login screens (mirrors FinanceTracker's single hardcoded-user model). No multi-device sync conflicts to resolve — one account, one household.

Three modules ship together as one app, but are **data-independent** of each other by design (per user decision during brainstorming): the meal planner does not auto-generate the grocery list, and the prep log does not deduct from any pantry/inventory. Each module is simple and self-contained; the user manually bridges them mentally (e.g., glancing at the week's plan while writing a grocery list).

## Architecture

- **Client:** Expo React Native app (new Expo project, name: `KitchenPlanner`)
- **Backend:** Express.js REST API, single-user (hardcoded/config userId, same pattern as FinanceTracker's userId 7)
- **Database:** PostgreSQL on Neon, schema managed via Drizzle ORM
- **Deployment:** Render free tier; reuse the UpTimeRobot 5-minute ping pattern from FinanceTracker to reduce cold-start sleep
- **Repo:** New GitHub repo named `KitchenPlanner`, created during implementation, following FinanceTracker's convention (main branch auto-deploys to Render)

Rejected alternative: fully offline-only app (Expo + local SQLite, no backend). Simpler to build, but loses cross-device access and reinstall durability. Since the user already operates a Postgres+Express backend for FinanceTracker, the marginal cost of standing up another is low and consistency with the existing workflow was preferred.

## Data Model

### Recipes (reusable library)

```text
{
  id,
  name,
  mealType,       // breakfast | lunch | snack | dinner (optional tag, for filtering when picking)
  ingredients: [{ name, quantity }],
  notes
}
```

### Meal Planner (calendar entries)

```text
{
  id,
  date,
  slot,           // breakfast | lunch | snack | dinner
  recipeId,       // FK -> Recipes, nullable
  recipeNameSnapshot, // denormalized copy of recipe name at time of planning
  note            // optional freeform override/addition, used when no recipe fits
}
```

Browsable by week or month view. Picking a recipe for a slot copies its name into `recipeNameSnapshot` so the plan remains readable even if the recipe is later edited or deleted.

### Grocery Lists (two independent lists, each with its own cycle)

```text
{
  id,
  listType,       // weekly | monthly
  category,       // produce | dairy | staples | cleaning | spices | other
  name,
  quantity,       // freeform text, e.g. "2 kg", "3 pcs"
  isFavorite,     // quick re-add template item
  checked,
  cycleStart      // date the current weekly/monthly cycle began
}
```

- **Weekly** = perishables (produce, dairy, meat, etc.), cycles every week.
- **Monthly** = staples/bulk/household (rice, oil, cleaning supplies, spices), cycles every month. Covers "whole kitchen needs," not just food.
- **"Start new week/month"** is a manual user-triggered action (not automatic on date rollover, to avoid surprise data loss). It:
  1. Copies all currently unchecked items forward into the new cycle.
  2. Offers one-tap re-add of favorited items.
  3. Updates `cycleStart` to the new period.

### Prep Log (cooking journal)

```text
{
  id,
  date,
  dishName,
  quantityMade,       // freeform text, e.g. "4 servings"
  ingredientsUsed: [string],
  notes
}
```

Standalone entries. Not required to reference a Recipe or a Meal Planner slot — logging is decoupled from planning, matching the user's stated priority of keeping modules independent.

## Screens

Bottom tab navigation, four tabs:

1. **Planner** — week/month calendar view of meal slots
2. **Recipes** — library list, add/edit/delete, ingredient list per recipe
3. **Grocery** — toggle between Weekly and Monthly lists, categorized item view, favorites, "Start new cycle" action
4. **Prep Log** — reverse-chronological journal, add/edit entries

## Error Handling & Edge Cases

- **Empty states:** each tab shows a friendly empty state ("No recipes yet — add your first one") instead of a blank screen.
- **Grocery cycle rollover:** manual trigger only, as described above — prevents accidental loss of an in-progress list.
- **Recipe deletion:** deleting a recipe does not break past/future plan slots that reference it; the plan slot retains `recipeNameSnapshot` as plain text.
- **Backend cold start:** Render free tier can sleep; show a lightweight "waking up..." loading state on first request of a session (same UX pattern as FinanceTracker).

## Testing

Matches FinanceTracker's approach for a personal single-user app: manual on-device verification per feature rather than an automated test suite. Verification pass before considering the app "done": add a recipe → plan a week using it → add/check off grocery items across both lists → start a new grocery cycle and confirm carryover → log a prep entry.

No auth flows, multi-user permissions, or concurrent-edit conflicts to test, since scope is explicitly single-user single-device-at-a-time.

## Out of Scope (explicitly deferred)

- Auto-generating grocery lists from the meal plan's recipe ingredients
- Pantry/inventory tracking with stock deduction on cooking
- Linking prep log entries to specific meal plan slots
- Multi-user/family sharing
- Push notifications/reminders
- Recipe photos
