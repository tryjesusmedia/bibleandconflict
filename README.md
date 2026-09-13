# Bible and Conflict of the Ages

A standalone Expo app by Try Jesus Media. It follows the entire Bible alongside the five-volume *Conflict of the Ages* set and shares a reader's place, completion state, Journey Points, private welcome name, and customizable public leaderboard name with the existing website.

## App identity

- Store name: `Bible and Conflict of the Ages`
- Expo slug: `bible-and-conflict-of-the-ages`
- URL scheme: `bibleandconflict`
- Android package: `com.tryjesusmedia.bibleandconflict`
- iOS bundle ID: `com.tryjesusmedia.bibleandconflict`
- Version: `1.0.0` (`versionCode`/`buildNumber` 1)
- Expo owner: `try-jesus-media`

This repository deliberately contains no `.git` history from another app, EAS project ID, update URL, signing file, service-account key, `.env`, or `node_modules`. Create the remote and EAS project only after confirming that the final package identifiers are available.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the same public Supabase URL and publishable/anonymous key used by `tryjesusmedia.com`. Never put the service-role key in the app.
3. Run `npm install`.
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

The existing shared Supabase project must already contain the tables/RPCs above and the deployed `delete-account` function. A reviewed copy of that Edge Function is included under `supabase/functions/delete-account`; deployment requires the project's service-role secret and must be done from a trusted operator environment, never from the mobile app.

## Release handoff

After the app is approved locally:

1. Create the empty GitHub repository `tryjesusmedia/bibleandconflict`, then add it as this repository's remote and push `main`.
2. Run `eas init` while signed in to the `try-jesus-media` Expo organization; verify the generated project belongs to this app before committing its EAS project ID.
3. Verify the Supabase redirect allow-list contains `bibleandconflict://auth/callback` and test Google sign-in, sign-out, first-link migration, and account deletion on a release build.
4. Create a new Google Play app, reserve `com.tryjesusmedia.bibleandconflict`, create/upload an Android App Bundle, complete the Data safety/App access/content declarations and store listing, test in a closed track, then promote to production.
5. For iOS, register the matching bundle ID and create the App Store Connect record before the first iOS build.

Do not reuse the Try Jesus Journey app's signing credentials, EAS project ID, Play listing, or update channel.
