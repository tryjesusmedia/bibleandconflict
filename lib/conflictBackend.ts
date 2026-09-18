// Public client configuration. Service-role keys must never be bundled in the app.
export const CONFLICT_PROJECT_URL = 'https://gabufylczphhykudwzbc.supabase.co';
export const CONFLICT_PUBLISHABLE_KEY = 'sb_publishable_3oQv1N-P1BVDGKpb7A_aEA_UYJIQXsB';
const JOURNEY_PROJECT_HOST = 'erejehmrtzjpqurbftsm.supabase.co';

export function conflictBackend(url = CONFLICT_PROJECT_URL, key = CONFLICT_PUBLISHABLE_KEY) {
  const parsed = new URL(url);
  if (parsed.hostname === JOURNEY_PROJECT_HOST) {
    throw new Error('Bible and Conflict must use its own Supabase project, separate from Try Jesus: The Journey.');
  }
  if (parsed.protocol !== 'https:' || !key) throw new Error('Invalid Bible and Conflict backend configuration.');
  return {
    url: parsed.origin,
    key,
    storageKey: `tjm-conflict-${parsed.hostname.split('.')[0]}-auth`,
  };
}
