import assert from 'node:assert/strict';
import { conflictBackend, CONFLICT_PROJECT_URL } from '../lib/conflictBackend.ts';
import { createClient } from '@supabase/supabase-js';

const config = conflictBackend();
assert.equal(config.url, CONFLICT_PROJECT_URL);
assert.throws(() => conflictBackend('https://erejehmrtzjpqurbftsm.supabase.co'), /separate/);
assert.throws(() => conflictBackend('https://EREJEHMRTZJPQURBFTSM.supabase.co/'), /separate/);
assert.throws(() => conflictBackend('http://example.com'), /Invalid/);

// Exercise the SDK's actual persistence with both clients in one browser store.
const saved = new Map();
const storage = { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
const jwt = (project) => `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: project, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
const makeSession = (project) => ({ access_token: jwt(project), refresh_token: `${project}-refresh`, expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user: { id: project } });
const journeyKey = 'sb-erejehmrtzjpqurbftsm-auth-token';
saved.set(journeyKey, JSON.stringify(makeSession('journey-fixture')));
const requests = [];
const fetch = async (url) => {
  requests.push(String(url));
  return new Response(null, { status: 204 });
};
const options = { global: { fetch }, auth: { storage, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false } };
const journey = createClient('https://erejehmrtzjpqurbftsm.supabase.co', 'public-test-key', options);
const conflict = createClient(config.url, config.key, { ...options, auth: { ...options.auth, storageKey: config.storageKey } });
assert.equal((await journey.auth.getSession()).data.session.user.id, 'journey-fixture');
assert.equal((await conflict.auth.getSession()).data.session, null, 'Conflict must not inherit an existing Journey login');
saved.set(config.storageKey, JSON.stringify(makeSession('conflict-fixture')));
assert.equal((await conflict.auth.getSession()).data.session.user.id, 'conflict-fixture');
await conflict.auth.signOut({ scope: 'local' });
assert.equal((await conflict.auth.getSession()).data.session, null);
assert.equal((await journey.auth.getSession()).data.session.user.id, 'journey-fixture');
assert.ok(requests.every((url) => url.startsWith(config.url)), 'Conflict logout must never contact Journey');
saved.set(config.storageKey, JSON.stringify(makeSession('conflict-fixture')));
await journey.auth.signOut({ scope: 'local' });
assert.equal((await conflict.auth.getSession()).data.session.user.id, 'conflict-fixture');
assert.equal((await journey.auth.getSession()).data.session, null);
await conflict.auth.stopAutoRefresh();
await journey.auth.stopAutoRefresh();
console.log('Independent SDK session persistence, logout, and backend guard passed.');
