# Deploying KitchenPlanner

Two independent steps: deploy the backend to Cloud Run, then build the mobile APK.
**Always deploy the backend first** if you changed anything under `server/` or
`shared/` — the APK is built pointing at the live backend URL
(`mobile/.env`'s `EXPO_PUBLIC_API_URL`), so an APK built against a stale backend
will have broken/missing endpoints.

## 1. Backend → Cloud Run

The `gcloud` CLI is installed at `~/google-cloud-sdk/bin/gcloud` but not on `PATH`.
It's already authenticated as `kumudhaglory@gmail.com`.

- Project: `kitchenplanner-506110`
- Service: `kitchenplanner-api`
- Region: `asia-south1`
- Live URL: `https://kitchenplanner-api-120691116755.asia-south1.run.app`

Deploy is source-based — `gcloud` uploads the repo, builds it with the root
`Dockerfile` (multi-stage: `npm run build` via esbuild, then `npm ci --omit=dev`
+ `node dist/index.js` in the runtime image), and rolls out a new revision.
Environment variables (`DATABASE_URL`, `JWT_SECRET`, `EMAILJS_*`,
`CLOUDINARY_*`, `ANTHROPIC_API_KEY`) already live on the Cloud Run service and
carry forward automatically — you don't need to pass them again unless one
actually changed.

From the repo root (`~/personal/KitchenPlanner`):

```bash
~/google-cloud-sdk/bin/gcloud run deploy kitchenplanner-api \
  --source . \
  --region=asia-south1 \
  --project=kitchenplanner-506110
```

Takes ~1-2 minutes (upload + container build + rollout). On success it prints
the revision name and confirms it's serving 100% of traffic.

**Sanity check** (optional): hit an endpoint with a manually-signed JWT, since
`requireAuth` only checks the signature, not that the user exists:

```bash
node -e "require('dotenv/config'); console.log(require('jsonwebtoken').sign({userId:1,email:'test@example.com'}, process.env.JWT_SECRET, {expiresIn:'5m'}))"
# then: curl -H "Authorization: Bearer <token>" https://kitchenplanner-api-120691116755.asia-south1.run.app/api/recipes
```

## 2. Mobile → APK

No Play Store — the app is sideloaded as a directly-built APK (no sensitive
permissions requiring Google review, unlike FinanceTracker). Signing falls
back to the debug keystore (fine for sideloading, not for a real Play Store
upload).

Before building, confirm `mobile/.env`'s `EXPO_PUBLIC_API_URL` points at the
Cloud Run URL above (not `localhost`).

```bash
cd ~/personal/KitchenPlanner/mobile/android
./gradlew assembleRelease
```

Takes ~1-2 minutes. Output:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

Copy it somewhere installable — e.g. to the Windows host filesystem from WSL:

```bash
cp app/build/outputs/apk/release/app-release.apk /mnt/c/Users/kgd122/Downloads/KitchenPlanner.apk
```

Then install `KitchenPlanner.apk` directly on the phone (enable "install from
unknown sources" if prompted).
