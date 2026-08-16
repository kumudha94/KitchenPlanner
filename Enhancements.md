# Enhancements — 2026-08-16

Tracking the changes requested from this round of app testing.

## 1. Grocery list sharing (WhatsApp)

- [x] Share icon added next to "Smart list from this week's plan" on the Shopping tab
- [x] Tapping it opens a selection sheet listing unchecked ("to buy") items, all pre-selected, individually toggleable
- [x] **Share** action opens the native OS share sheet (works with WhatsApp or any other app)
- [x] **Copy** action copies the same list to the clipboard (`expo-clipboard` dependency added) for pasting anywhere
- [x] Copy confirmation is inline (button swaps to "Copied" with a green checkmark-circle icon for the rest of the modal session) rather than a popup alert, per follow-up feedback
- [x] Verified: `npx tsc --noEmit` passes in `mobile/`

## 2. Grocery → Pantry with purchase details

- [x] `pantryItems` schema extended with `quantity`, `cost`, `expiryDate` (all nullable/optional)
- [x] Checking off a grocery item opens an "Add to Pantry" modal (qty/cost/expiry, all optional)
  - **Save** → new `POST /api/grocery/:id/move-to-pantry` endpoint atomically creates the pantry row and removes the grocery item
  - **Skip** → falls back to the old behavior (item stays checked in the list until "Clear")
- [x] Repurchasing an item already in pantry creates a **new** pantry row (own qty/cost/expiry) rather than merging, so expiry stays accurate per batch
- [x] Manual "Add to Pantry" form gets a collapsible "+ details" section for the same three fields
- [x] Pantry list rows show a qty/cost/expiry subtext line when present
- [x] Verified: `npm run check` (server) and `npx tsc --noEmit` (mobile) both pass
- [x] Verified end-to-end against the dev DB with a throwaway script (move-to-pantry transaction + manual add), then removed the script

## 3. App icon update

- [x] Wired `mobile/assets/icon-source.png` into `mobile/app.json` as the app icon (`expo.icon`) and Android adaptive icon foreground
- [x] Regenerated native Android icon resources via `npx expo prebuild --platform android` — `mobile/android/` is gitignored (regenerated, not hand-edited), confirmed only `app.json` changed in git
- [x] Previewed the generated launcher icons locally (converted the generated `.webp` files to PNG to inspect)
  - **Finding:** `icon-source.png` already has its own baked-in cream rounded-square background/shape rather than being a transparent full-bleed foreground layer. On the circular and legacy launcher icon shapes this shows as a visible purple ring/frame around the icon (the `adaptiveIcon.backgroundColor` peeking out past the image's own shape), and the heart/hat graphics get slightly clipped on the round variant. Usable, but not pixel-perfect — worth a full-bleed version of the artwork (no background baked in) if a cleaner adaptive icon is wanted later.
- [ ] Visually confirm on an actual device/launcher (only checked via converted PNG previews so far)

## 4. Expo SDK 52 → 54 upgrade

Triggered by Expo Go (SDK 54 installed on-device) refusing to open the SDK 52 project.

- [x] Upgraded incrementally per Expo's guidance (52 → 53 → 54), running `npx expo install --fix` and `npx expo-doctor` after each step
- [x] Bumped `react` → 19.1.0, `react-dom` → 19.1.0, `react-native` → 0.81.5, `expo` → ^54.0.36, plus all `expo-*` packages and `@types/react`/`typescript`/`babel-preset-expo` to their SDK-54-required versions
- [x] `npx expo-doctor` — 18/18 checks passing
- [x] Checked code for SDK 54 breaking changes: no direct `expo-file-system` imports (API overhaul doesn't touch us), `notifications.ts` only uses current (non-deprecated) `expo-notifications` APIs — both low-risk
- [x] Deleted and regenerated `mobile/android/` via `npx expo prebuild --platform android` (gitignored/disposable, so this was safe) — required because the native project was built for SDK 52
- [x] `npx tsc --noEmit` passes clean under React 19 / RN 0.81 types
- [ ] **Edge-to-edge is now mandatory on Android** (SDK 54 change, can't be disabled) — only `PlannerScreen.tsx` currently uses `react-native-safe-area-context`'s insets; other screens haven't been checked for content sitting under the status/nav bar. Worth a visual pass once you're back on-device.
- [ ] Didn't start my own `expo start` — you already had one running (port 8081, the same terminal that showed the original error). **Restart that terminal** (Ctrl+C, re-run) so it picks up the new `node_modules`; Expo Go should then match SDK 54 and connect normally.
- [x] Rebuilt the sideloaded APK against the SDK 54 native project (`cd mobile/android && ./gradlew assembleRelease`, build succeeded in 5m 7s) and copied it to `C:\Users\kgd122\Downloads\KitchenPlanner.apk` — includes the new icon, pantry-move flow, and WhatsApp share, all on SDK 54

## 5. Keyboard hiding the email field (sign-in screen)

Reported from a screenshot: on the "Enter your email" screen, the keyboard covered the input with no scroll/auto-adjust.

- [x] Root cause: `EmailEntryScreen.tsx` and `OtpScreen.tsx` both set `KeyboardAvoidingView`'s `behavior` to `undefined` on Android, relying on `windowSoftInputMode="adjustResize"` to resize the window — which stopped reliably working once edge-to-edge became mandatory in SDK 54 (see item 4)
- [x] Fixed both screens: `behavior={Platform.OS === "ios" ? "padding" : "height"}`
- [x] `npx tsc --noEmit` passes
- [x] Rebuilt the APK and copied to `C:\Users\kgd122\Downloads\KitchenPlanner.apk`
- [x] **Add/Edit Recipe screen hit the same issue** (reported separately): it already used a `ScrollView` but had no `KeyboardAvoidingView` around it, so scrolling couldn't reveal fields near the bottom (Notes, Save) once the keyboard was up. Wrapped it in `KeyboardAvoidingView` (`behavior="height"` on Android) plus `keyboardShouldPersistTaps="handled"` on the ScrollView so taps on chips/buttons aren't swallowed while the keyboard is dismissing.
- [ ] Checked the remaining screens with text inputs: `RecipesScreen`'s search bar and `SlotEditorScreen`'s recipe-search are both at the *top* of their screen (low risk — input itself stays visible, only list content below is covered). `SlotEditorScreen`'s note mode and `RemindersScreen`'s inline add-form weren't confirmed broken but weren't ruled out either — not touched since neither was reported. Flag if either turns out to have the same problem.

## Pending / not done yet

- [x] `npm run db:push` — schema changes (pantry quantity/cost/expiryDate columns) applied to the dev database
- [x] **Rebuild & resideload the Android APK** — done above (SDK 54, new icon, both features), copied to Downloads
- [ ] **Deploy to Render** — `kitchenplanner-api` has not been redeployed; these backend changes only exist locally until pushed/deployed
- [ ] **Install the new APK on your phone** — it's in Downloads, but you still need to sideload/open it there
- [ ] On-device testing — check-off → pantry modal flow, "Skip" path, the WhatsApp share sheet, the app icon, and the edge-to-edge layout haven't been clicked through on an actual device yet
