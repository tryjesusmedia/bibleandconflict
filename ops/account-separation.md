# Separate ChronBible and Bible & Conflict accounts

Status on 2026-09-18: **prepared, not cut over**. Do not merge the website switch or release the app until Google OAuth and the data migration are complete.

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
- Copied schema/functions only. **No real accounts or reader data have been copied yet.**
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
6. Verify the new project's Google flow with a disposable test account before opening registration or copying the real users.

The connector does not expose provider settings. The browser is currently at the Supabase dashboard sign-in page; dashboard authentication is the immediate blocker.

## Non-destructive migration and coordinated cutover

Read [Supabase's Auth migration guide](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-supabase-projects) before importing users. Reconfirm Auth schema compatibility.

1. Keep the website PR in draft and app release unpublished until the target Google sign-in works. Take a recoverable source backup.
2. Run `ops/export-conflict-snapshot.sql` read-only in the old project for a consistent Conflict-only snapshot. The query includes participants in every Conflict table, not every Journey account. It excludes ChronBible principles/progress and all chat/journal/guide/purchase records. Check every exported account uses Google and has no password/MFA identity requiring a different migration. A preliminary settings/progress check found 10 Google accounts and no passwords; rerun against the final full participant set.
3. Import matching `auth.users` and Google `auth.identities` into the new project preserving UUIDs and confirmation/ban state; initialize empty password/token fields as required by Auth. Do not import sessions, refresh tokens, flow states, password hashes, or JWT secrets. Preserve generated email columns through their underlying data, not direct writes.
4. Import the twelve table subsets in FK order: profiles/reward profiles, settings/progress, principles/layouts/highlights, posts, then replies and moderation. Preserve source IDs, timestamps, tombstones, profile names, aliases, and completion indexes. During the privileged, transactional import, account for the user-creation, discussion-identity, and updated-at triggers so they do not rewrite snapshot values. Never disable source triggers or RLS. Validate every FK, per-table count, sorted row checksum, and participant boundary before committing the import. Keep private snapshot files out of git/logs and remove them after verification.
5. Complete the final snapshot/cutover together. Do not run ongoing cross-project replication. Old app versions still write to the original backend; resolve their update/migration path before declaring complete separation. A later delta import must not overwrite newer target edits or resurrect target deletions.
6. Deploy the website PR after migration and OAuth verification. Build/release standalone app 1.0.3 (Android 4 / iOS 3) from the matching reviewed commit. Legacy generic EAS Supabase environment variables are ignored; optional staging overrides use `EXPO_PUBLIC_CONFLICT_SUPABASE_*`.
7. With the same Google account, sign in to ChronBible only and confirm Conflict remains signed out. Then sign in to Conflict and verify its existing progress. Sign out of either and confirm the other stays signed in. Change Conflict name/progress and confirm ChronBible is unchanged.
8. Test app-to-Conflict-web progress sync on an installed release build. Test deleting a disposable Conflict account and confirm the corresponding Journey test account/progress remain intact. Never delete a real reader as a test.
9. Update this status only after verifying the live website and installed app. The shared-account wording changes in the website PR must ship with the actual cutover, not beforehand.

If a cutover check fails, keep the current production clients on the original project while correcting the target. After target users begin writing, do not blindly revert to the old database; preserve and reconcile new target changes first.
