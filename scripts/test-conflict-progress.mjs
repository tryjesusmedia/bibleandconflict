import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  accountConflictProgressKey,
  conflictLoadIdentity,
  emptyConflictProgress,
  guestConflictProgressKey,
  hasConflictAccountData,
  hasConflictJourneyActivity,
  isConflictLoadCurrent,
  newerConflictProgress,
  normalizeConflictProgress,
  selectConflictProgress,
  shouldLinkGuestConflictProgress,
} from '../lib/conflictProgressCore.ts';
import { createSerialTaskQueue, isLatestMutation } from '../lib/serialMutationCore.ts';

const base = 'conflict-progress';
assert.notEqual(guestConflictProgressKey(base), accountConflictProgressKey(base, 'user-a'));
assert.notEqual(accountConflictProgressKey(base, 'user-a'), accountConflictProgressKey(base, 'user-b'));
assert.deepEqual(normalizeConflictProgress({ completed_indices: [1695, 0, 0, -1, 1696, 2.5, '4'], last_index: 999 }, 1696, 264), {
  completed: [0, 1695], lastIndex: 263, updatedAt: '',
});
assert.deepEqual(emptyConflictProgress(), { completed: [], lastIndex: 0, updatedAt: '' });
const emptyPrimary = { completed: [], lastIndex: 0, updatedAt: '2026-09-10T11:00:00.000Z' };
assert.equal(hasConflictAccountData(null, 0, false), false, 'An untouched default settings row is not an established journey');
assert.equal(hasConflictAccountData(emptyPrimary, 0, false), false, 'The website-created empty canonical row is not an established journey');
assert.equal(hasConflictAccountData(null, 1, false), true, 'A non-default reading position is established journey data');
assert.equal(hasConflictAccountData(null, 0, true), true, 'Legacy completion/open activity is established journey data');
assert.equal(hasConflictAccountData({ ...emptyPrimary, completed: [0] }, 0, false), true, 'A canonical completion is established journey data');
assert.equal(hasConflictJourneyActivity(emptyPrimary), false, 'Timestamp-only local snapshots are empty journey placeholders');

const guest = { completed: [0, 1], lastIndex: 1, updatedAt: '2026-09-10T12:00:00.000Z' };
const remote = { completed: [4], lastIndex: 4, updatedAt: '2026-09-10T13:00:00.000Z' };
assert.equal(shouldLinkGuestConflictProgress(null, null, guest, null, 'user-a'), true, 'First sign-in must link existing guest progress');
const defaultSettingsOnly = hasConflictAccountData(emptyPrimary, 0, false);
assert.equal(shouldLinkGuestConflictProgress(null, defaultSettingsOnly ? remote : null, guest, null, 'user-a'), true, 'A pre-existing default-only settings row must not block guest migration');
assert.equal(shouldLinkGuestConflictProgress(emptyPrimary, emptyPrimary, guest, null, 'user-a'), true, 'Empty local and remote placeholder snapshots must not block guest migration');
assert.equal(shouldLinkGuestConflictProgress(null, remote, guest, null, 'user-a'), false, 'A different established cloud copy must not be overwritten');
assert.equal(shouldLinkGuestConflictProgress(remote, remote, guest, 'user-a', 'user-a'), true, 'Detached same-account edits must rejoin their account');
assert.equal(shouldLinkGuestConflictProgress(null, null, guest, 'user-a', 'user-b'), false, 'Another account must not consume detached data');
assert.deepEqual(newerConflictProgress(guest, remote), remote);
assert.deepEqual(selectConflictProgress(guest, remote), remote);

const load = { generation: 5, identity: conflictLoadIdentity('user-a') };
assert.equal(isConflictLoadCurrent(load.generation, 5, load.identity, 'user-a', false), true);
assert.equal(isConflictLoadCurrent(load.generation, 6, load.identity, 'user-a', false), false);
assert.equal(isConflictLoadCurrent(load.generation, 5, load.identity, 'user-b', false), false);
assert.equal(isConflictLoadCurrent(load.generation, 5, load.identity, 'user-a', true), false);

let releaseFirst;
const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
const calls = [];
const queue = createSerialTaskQueue();
void queue.enqueue(async () => { calls.push('first:start'); await firstGate; calls.push('first:end'); });
void queue.enqueue(async () => { calls.push('second:start'); calls.push('second:end'); });
await Promise.resolve();
assert.deepEqual(calls, ['first:start'], 'A second full-snapshot save must not overlap the first');
releaseFirst();
await queue.drain();
assert.deepEqual(calls, ['first:start', 'first:end', 'second:start', 'second:end']);
assert.equal(isLatestMutation(1, 2), false, 'An older response must not repaint newer optimistic progress');
assert.equal(isLatestMutation(2, 2), true);

let releaseRapidSave;
const rapidSaveGate = new Promise((resolve) => { releaseRapidSave = resolve; });
const returnQueue = createSerialTaskQueue();
const returnEvents = [];
let cloudSnapshot = [];
let visibleSnapshot = [0, 1];
void returnQueue.enqueue(async () => {
  returnEvents.push('toggle-0:start');
  await rapidSaveGate;
  cloudSnapshot = [0];
  returnEvents.push('toggle-0:end');
});
void returnQueue.enqueue(async () => {
  cloudSnapshot = [0, 1];
  returnEvents.push('toggle-1:saved');
});
void returnQueue.enqueue(async () => {
  visibleSnapshot = [...cloudSnapshot];
  returnEvents.push('foreground:refreshed');
});
await Promise.resolve();
assert.deepEqual(returnEvents, ['toggle-0:start']);
releaseRapidSave();
await returnQueue.drain();
assert.deepEqual(returnEvents, ['toggle-0:start', 'toggle-0:end', 'toggle-1:saved', 'foreground:refreshed'], 'A return-from-external refresh must run after rapid queued toggles');
assert.deepEqual(visibleSnapshot, [0, 1], 'Foreground refresh must not repaint an older cloud snapshot');

const resilientQueue = createSerialTaskQueue();
await assert.rejects(resilientQueue.enqueue(async () => { throw new Error('expected'); }));
let recovered = false;
await resilientQueue.enqueue(async () => { recovered = true; });
assert.equal(recovered, true, 'A handled record-open failure must not poison later progress saves');

const store = await readFile(new URL('../lib/conflictProgress.ts', import.meta.url), 'utf8');
const provider = await readFile(new URL('../contexts/ConflictJourneyContext.tsx', import.meta.url), 'utf8');
assert.match(store, /CONFLICT_PLAN_ID/u);
assert.match(store, /reading_plan_progress/u);
assert.match(store, /CONFLICT_PROGRESS_PLAN_ID/u);
assert.match(store, /conflict_journey_settings/u);
assert.match(store, /conflict_reading_progress/u);
assert.match(store, /legacyProgressIndex|migrateLegacyProgress/u);
assert.match(store, /remoteLoad\.needsPrimaryWrite \|\| linkGuest \|\| selectedTime > remoteTime/u, 'First-link guest progress and legacy migrations must create the canonical row');
assert.match(store, /accountDataExisted \? newestISO\(settings\.updated_at, legacyUpdatedAt\) : ''/u, 'A newly-created empty settings row must not outrank first-link guest progress');
assert.match(store, /accountDataExisted: hasConflictAccountData\(canonicalProgress, settingIndex, legacyActivityExists\)/u, 'An empty website-created canonical row must not block first-link guest migration');
assert.match(store, /hasConflictAccountData\(\s*null,\s*settingIndex,\s*legacyActivityExists/u, 'Only meaningful settings or legacy activity may block first-link guest migration');
assert.match(store, /GUEST_LINK_TARGET_KEY/u);
assert.match(store, /target === userId \? \[GUEST_LINK_TARGET_KEY\] : \[\]/u, 'Deleting an account must release its detached checkpoint so a future account can link local progress');
assert.match(provider, /prepareConflictDetach\(userId, true\)[^]*signOut/u);
assert.match(provider, /body: \{ confirmation: true \}/u);
assert.match(provider, /isConflictLoadCurrent/u);
assert.match(provider, /createSerialTaskQueue/u);
assert.match(provider, /isLatestMutation/u);
assert.match(provider, /syncConflictReadingAggregate\(currentUserId, reading, new Set\(saved\.completed\)\)/u, 'Aggregate compatibility rows must derive from the serialized saved snapshot');
assert.match(provider, /await saveQueue\.current\.enqueue\(runLoad\)/u, 'Foreground refreshes must be ordered after pending optimistic saves');
assert.match(provider, /saveQueue\.current\.enqueue\(async \(\) => \{[^]*syncConflictReadingAggregate\(currentUserId, reading, currentCompleted, kind\)/u, 'Opening an external reading must use the same serial aggregate queue');

console.log('Account isolation, first-link migration, dual-format website sync, detach, deletion, and auth-race checks passed.');
