# Bible and Conflict of the Ages

A standalone Expo app by Try Jesus Media. It follows the entire Bible alongside the five-volume *Conflict of the Ages* set and shares a reader's place, completion state, Journey Points, private welcome name, and customizable public leaderboard name with the existing website.

## App identity

- Store name: `Bible and Conflict of the Ages`
- Expo slug: `bible-and-conflict-of-the-ages`
- URL scheme: `bibleandconflict`
- Android package: `com.tryjesusmedia.bibleandconflict`
- iOS bundle ID: `com.tryjesusmedia.bibleandconflict`
- Prepared update: `1.0.5` (Android `versionCode` 6 / iOS `buildNumber` 5), using the supplied shiny lion-and-lamb app icon and retaining the reading badges. The signed Android bundle was uploaded and submitted for Google Play review on September 18, 2026, with a 100% production rollout and managed publishing off. It is not yet verified publicly available.
- Expo owner: `try-jesus-media`

This app has its own EAS project (`fa359745-0c6d-41ca-adb4-444b4417d73e`) and Supabase project. Signing files, service-account keys, `.env`, and `node_modules` do not belong in git.

## Local setup

1. Production public configuration is in `lib/conflictBackend.ts`; no secret is required to build.
2. For a separate staging project, copy `.env.example` to `.env.local` and use `EXPO_PUBLIC_CONFLICT_SUPABASE_*`. Legacy `EXPO_PUBLIC_SUPABASE_*` variables are deliberately ignored. The Journey project is rejected. Never put a service-role key in the app.
3. Run `npm ci`.
4. Run `npm test`, `npm run typecheck`, and `npm run lint`.
5. Run `npx expo start` to test on a device or simulator.

Google OAuth must allow `bibleandconflict://auth/callback` in Supabase Authentication. Google sign-in is optional; unsigned readers use account-isolated local storage and their first local journey is moved safely into the first empty account they link.

## Exact website sync contract

- Aggregate/settings plan: `bible-conflict-ages-v1`
- Primary item progress plan: `bible-conflict-ages-chapters-v1`
- Primary table: `reading_plan_progress`
- Website compatibility tables: `conflict_journey_settings` and `conflict_reading_progress`
- Profile RPCs: `ensure_journey_profile`, `update_journey_alias`, `get_my_journey_first_name`, `update_my_journey_first_name`
- Leaderboard RPC: `get_conflict_journey_leaderboard`
- Rewards: 10 points per distinct item across indexes 0–1695

The task indexes intentionally reserve every supplied `legacyProgressIndex` before filling the gaps. Changing this algorithm would move existing users' completions to the wrong chapters. `data/conflictPlan.json` is a byte-for-byte snapshot of the website source; its expected hash and counts live in `data/siteParity.json`.

Progress is currently stored as a full completion snapshot with one `updated_at` value. When two snapshots conflict, the newer snapshot wins so an intentional uncheck is not resurrected. Distinct offline additions cannot be safely unioned without also risking that data loss; conflict-free merging would require a future shared schema with per-item update/removal timestamps.

The dedicated Supabase project is `gabufylczphhykudwzbc` (Bible and Conflict). Its baseline migration is in this repository; do not apply it to the Journey project. The `delete-account` Edge Function refuses to run outside this project and verifies the user with Supabase Auth before deleting. Its service-role key stays server-side. See [the cutover runbook](ops/account-separation.md) before publishing these changes.

## App icon

The launcher icon uses the owner-supplied `Lion and Lamb faithcraft shiny.png` (source SHA-256 `847e730af5705bff330a3e0301227b0ed525ecc07ab7536c531421876e3856b1`). Standard/iOS artwork is composited onto Midnight Navy in a 1024px opaque PNG. Android uses the same artwork centered in a transparent 1024px foreground with the configured Midnight Navy background; padding preserves the full logo under round and rounded launcher masks. Colors, lettering, and illustration are preserved.

## Reading badges

All 264 readings have a unique labeled vector badge. Complete every assigned Scripture and companion item in a reading to earn it. Badges appear under Progress and beside the completed reading title; tapping expands the badge to a fullscreen viewer and tapping again shrinks it. Android Back and Close also dismiss the viewer; reduced motion is supported.

Badges derive from the existing completion snapshot. Past completions earn badges automatically, unchecking an item removes that completed-reading badge, and account changes clear the viewer. No database migration or separate badge storage is needed. The standalone app and Conflict webpage award matching badges from matching synced progress.

The canonical artwork and theme map live in `tryjesusmedia/tjm`: `scripts/reading-badge-art.cjs`, `scripts/reading-badge-themes.tsv`, and `scripts/build-reading-badges.mjs`. Run the generator with this app checkout as its argument to update both copies. Run `TJM_SITE_ROOT=/path/to/tjm npm run test:badges` to verify all designs and app/web parity.

## Release handoff

After the app is approved locally:

1. Complete the account-separation cutover checks in `ops/account-separation.md`.
2. Keep the existing standalone EAS project ID; build from the reviewed commit.
3. Verify the Supabase redirect allow-list contains `bibleandconflict://auth/callback` and test Google sign-in, sign-out, first-link migration, and account deletion on a release build.
4. Use the existing Google Play listing for `com.tryjesusmedia.bibleandconflict` under Try Jesus Media (developer account `5712654634415606173`, app `4976442224378840807`). Do not create a duplicate app. Production was verified at 1.0.1 / build 2 on September 18. Use the new-icon bundle from [release run 35390940684](https://github.com/tryjesusmedia/tryjesusjourney/actions/runs/35390940684), built from `b6b935bbc5d933496edafb32e9e2b6aca707f4a6`. Earlier build 5 and build 4 artifacts are superseded and do not include the newly supplied shiny icon. After renewed publishing authorization, build 6 was uploaded through the browser and release 3, `1.0.5 — New icon, reading badges and sync`, was submitted for review. Publishing overview shows Changes in review, quick checks running, a full production rollout, and managed publishing off. Google will publish after approval; public availability has not yet been verified. Do not upload the bundle again. See `ops/account-separation.md` for verified build status and checksums.
5. For iOS, register the matching bundle ID and create the App Store Connect record before the first iOS build.

Do not reuse the Try Jesus Journey app's signing credentials, EAS project ID, Play listing, or update channel.
