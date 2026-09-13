# Shared backend

This app intentionally uses the same Supabase project and row-level-security contracts as the live Bible and Conflict of the Ages webpage. No service-role credential belongs in this repository or in an Expo build.

The app reads and writes only the signed-in user's rows. Public leaderboard output comes only from the curated `get_conflict_journey_leaderboard` RPC, which exposes rank, the reader's chosen leaderboard name, points, completed-item count, and whether the row belongs to the caller. Email, user ID, avatar, and private welcome name are not part of the leaderboard model.

The bundled deletion function requires a valid user bearer token plus `{ "confirmation": true }`, validates that token with the user-scoped client, and performs deletion with the server-only service role.
