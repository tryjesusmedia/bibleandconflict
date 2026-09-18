# Separate ChronBible and Bible & Conflict accounts

Status on 2026-09-18: **website separation, FaithCraft completion cards, and 264 reading badges are live; Android 1.0.4 / build 5 is signed; Google Play upload remains pending**. Website PR #37 deployed the feature as `a353b2474538e6cb19e7da6122d27551f6caaf01`; PR #38 adds spacing above the progress statistics.

The badge release source is app commit `e71e59ad2e1ee1af339e8a56093b238382725a9e` (PR #5), including all earlier independent-account, reading-label, and completion-card changes. It adds identical app/web badge artwork, Progress galleries, badges beside completed reading titles, and tap-to-grow/shrink fullscreen viewers. Badges use existing synced completion records; no migration is needed. All source, progress, auth, isolation, and 264-badge tests passed in [release run 35384519061](https://github.com/tryjesusmedia/tryjesusjourney/actions/runs/35384519061).

Release run 35384519061 completed successfully, including the clean install, typecheck, lint, tests, callback/isolation checks, and native signing. Artifact `bible-and-conflict-android-5-reading-badges` (ID `10563854141`) expires October 2, 2026. ZIP SHA-256: `693e4c4a3d81773faa81fb8db54abad035b1b60dba9eb5934344cce125a4ea5b`. AAB SHA-256: `71998390b0da5fa6197c13ad5c591f975d3c5b9e1300978ca9007cf8b0031712` (82,236,552 bytes). Archive CRCs and signature entries were checked. Google Play submission was skipped.

**All earlier Android build 4 bundles are superseded and lack reading badges. Do not upload them for this release.** Production was verified at 1.0.1 / build 2 on September 18. The earlier browser upload was denied by permission policy; it was not retried, and Google Play submission was not requested through another route. Production draft release 3 is saved as `1.0.4 — Reading badges and independent sync`, with matching badge/completion/sync release notes. The owner must manually upload build 5 there and review the release. No bundle has been uploaded or submitted for review by this work. EAS submission remains opt-in and is skipped for this build.

Suggested release notes:

> Earn a unique badge for each completed reading. Find your collection in Progress and beside reading titles, and tap any badge to enlarge it. Includes independent Bible and Conflict account sync, simpler reading labels, and refreshed reading-complete cards.

Google provider and return URLs were saved by the owner, and OAuth reaches Google’s account chooser. Final signed-in callback and installed-app sync checks still require a device. Verify the same account sees matching completed-reading badges on the website and this new app build before promoting the release.

## Project boundary

| Surface | Supabase project | Session |
| --- | --- | --- |
| ChronBible / Try Jesus: The Journey | `erejehmrtzjpqurbftsm` | Existing project and session storage |
| Bible & Conflict website / standalone app | `gabufylczphhykudwzbc` | `tjm-conflict-gabufylczphhykudwzbc-auth` |

Accounts, signing keys, refresh tokens, profile changes, rewards, and deletion are independent. The same Google email may be used to sign in separately to both. Conflict app/web sync with each other, never with ChronBible.

## Prepared and verified

- Created Bible and Conflict in tryjesusmedia's Org, us-west-1; Supabase quoted $0/month at creation.
- Applied `20260918154302_independent_conflict_backend.sql` to the new project only.
- Twelve public tables have RLS; plan constraints reject ChronBible rows.
- Imported the Conflict-only snapshot taken at `2026-09-18T16:55:54Z`: 10 Google accounts/identities, 10 profiles and reward profiles, 8 plan-progress rows, 10 journey settings, 51 reading-progress rows, 8 principles, 2 layouts, and 1 highlight. Discussion and moderation subsets were empty. Every imported row and selected Auth field matched exactly before commit. Source data remains intact; no ongoing replication exists.
- `ops/import-conflict-snapshot.mjs` generates privileged, transactional DML, defaults to rollback, refuses a nonempty destination, and rejects credentials, foreign participants, and non-Conflict plans. A full rollback rehearsal passed before the final import. **Do not rerun the importer against the populated target.**
- Internal helpers and trigger functions live in the unexposed `private` schema with no authenticated execute grants.
- Deployed the dedicated `delete-account` function. It rejects the wrong project, checks the caller with Auth `getUser()`, revokes refresh sessions, then deletes that Conflict user. Gateway JWT verification is disabled because the function performs its own Auth verification (including support for the project's signing keys). Missing authentication returned HTTP 401.
- Rolled-back database tests passed for account ownership, plan isolation, private notes/maps, scoring, anonymous denial, and account-deletion cascades. No fixture users remain.
- SDK tests passed with both projects using the same browser storage: neither sign-in nor sign-out crosses to the other.
- Callback/progress/UI tests, TypeScript, lint, and Android JavaScript bundle export passed. This is not an installed-device Google-login test or a signed store build.

Supabase's [security-definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) flags the authenticated RPC wrappers intentionally used by the app. They enforce ownership; private helpers have no user access. The [RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) applies to the three reward/moderation tables intentionally accessed only through these wrappers.

## Google sign-in prerequisite

In the new project's Authentication settings:

1. Configure Google OAuth with an authorized Google web OAuth client. Enter secrets securely in the provider dashboard, never git or chat.
2. Authorize this exact Google redirect URI:
   `https://gabufylczphhykudwzbc.supabase.co/auth/v1/callback`.
3. Set the site URL to `https://tryjesusmedia.com/bibleandconflictoftheages/`.
4. Allow `https://tryjesusmedia.com/bibleandconflictoftheages/` and `bibleandconflict://auth/callback`. Add only specific preview URLs needed for validation.
5. Leave the Journey project's provider and redirects unchanged. Do not transfer its JWT signing key or sessions.
6. Verify a completed Google callback with a real or disposable account before promoting the change. Do not delete an existing reader as a test.

The owner configured the Google provider and both return URLs in the dashboard. The public provider endpoint reports Google enabled, and the preview's Google button reaches the account chooser. No user credential exchange has been performed by the agent, so this does not yet prove a completed Google callback. The preview intentionally returns to the production Conflict URL; test the full callback on production after deployment.

## Non-destructive migration and coordinated cutover

Read [Supabase's Auth migration guide](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) before importing users. Reconfirm Auth schema compatibility. Steps 2–4 below were completed on September 18; they describe the original migration procedure, not permission to overwrite the populated target.

1. Keep a recoverable source copy. The original source rows remain unchanged. Website cutover can proceed independently of a mobile release after the migration and Google redirect check; do not claim old installed apps use the new backend.
2. Run `ops/export-conflict-snapshot.sql` read-only in the old project for a consistent Conflict-only snapshot. The query includes participants in every Conflict table, not every Journey account. It excludes ChronBible principles/progress and all chat/journal/guide/purchase records. Check every exported account uses Google and has no password/MFA identity requiring a different migration. A preliminary settings/progress check found 10 Google accounts and no passwords; rerun against the final full participant set.
3. Import matching `auth.users` and Google `auth.identities` into the new project preserving UUIDs and confirmation/ban state; initialize empty password/token fields as required by Auth. Do not import sessions, refresh tokens, flow states, password hashes, or JWT secrets. Preserve generated email columns through their underlying data, not direct writes.
4. Import the twelve table subsets in FK order: profiles/reward profiles, settings/progress, principles/layouts/highlights, posts, then replies and moderation. Preserve source IDs, timestamps, tombstones, profile names, aliases, and completion indexes. During the privileged, transactional import, account for the user-creation, discussion-identity, and updated-at triggers so they do not rewrite snapshot values. Never disable source triggers or RLS. Validate every FK, per-table count, sorted row checksum, and participant boundary before committing the import. Keep private snapshot files out of git/logs and remove them after verification.
5. Complete the final snapshot/cutover together. Do not run ongoing cross-project replication. Old app versions still write to the original backend and do not sync with the newly separated website. Users need the new standalone app release for independent native accounts. A later delta import must not overwrite newer target edits or resurrect target deletions.
6. Deploy the website PR after migration and OAuth verification. Build/release standalone app 1.0.4 (Android 5 / iOS 4) from the matching reviewed commit. Legacy generic EAS Supabase environment variables are ignored; optional staging overrides use `EXPO_PUBLIC_CONFLICT_SUPABASE_*`.
7. With the same Google account, sign in to ChronBible only and confirm Conflict remains signed out. Then sign in to Conflict and verify its existing progress. Sign out of either and confirm the other stays signed in. Change Conflict name/progress and confirm ChronBible is unchanged.
8. Test app-to-Conflict-web progress sync on an installed release build. Test deleting a disposable Conflict account and confirm the corresponding Journey test account/progress remain intact. Never delete a real reader as a test.
9. Update this status only after verifying the live website and installed app. The shared-account wording changes in the website PR must ship with the actual cutover, not beforehand.

If a cutover check fails, keep the current production clients on the original project while correcting the target. After target users begin writing, do not blindly revert to the old database; preserve and reconcile new target changes first.
