import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CONFLICT_PLAN_ID,
  CONFLICT_PROGRESS_PLAN_ID,
  CONFLICT_READING_COUNT,
  CONFLICT_TASK_COUNT,
  conflictPlan,
  conflictReadingComplete,
  conflictReadingIndex,
  type ConflictReading,
} from '@/data/conflictPlan';
import {
  accountConflictProgressKey,
  emptyConflictProgress,
  guestConflictProgressKey,
  hasConflictAccountData,
  newerConflictProgress,
  normalizeConflictProgress,
  selectConflictProgress,
  shouldLinkGuestConflictProgress,
  type ConflictProgress,
  type StoredConflictProgress,
} from '@/lib/conflictProgressCore';
import { supabase } from '@/lib/supabase';

export type { ConflictProgress } from '@/lib/conflictProgressCore';

const BASE_LOCAL_KEY = 'tryjesus_conflict_plan_progress_v1';
const GUEST_LOCAL_KEY = guestConflictProgressKey(BASE_LOCAL_KEY);
const GUEST_LINK_TARGET_KEY = `${GUEST_LOCAL_KEY}:link-target`;

type ConflictSettingsRow = {
  start_date: string;
  schedule_mode: 'pace' | 'calendar';
  last_reading_id: string | null;
  updated_at?: string | null;
};

type LegacyProgressRow = {
  reading_id: string;
  bible_complete: boolean;
  commentary_complete: boolean;
  bible_opened_at?: string | null;
  commentary_opened_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function newestISO(...values: (string | null | undefined)[]) {
  return values.reduce<string>((newest, value) => {
    if (!value) return newest;
    return Date.parse(value) > Date.parse(newest || '1970-01-01T00:00:00.000Z') ? value : newest;
  }, '');
}

function normalize(input?: StoredConflictProgress | null) {
  return normalizeConflictProgress(input, CONFLICT_TASK_COUNT, CONFLICT_READING_COUNT);
}

async function readStored(key: string): Promise<ConflictProgress | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw) as StoredConflictProgress);
  } catch {
    return null;
  }
}

async function writeStored(key: string, progress: ConflictProgress) {
  await AsyncStorage.setItem(key, JSON.stringify(progress));
}

async function readGuestProgress() {
  return await readStored(GUEST_LOCAL_KEY) ?? emptyConflictProgress();
}

async function writeGuestProgress(progress: ConflictProgress) {
  await writeStored(GUEST_LOCAL_KEY, progress);
}

async function readAccountProgress(userId: string) {
  return readStored(accountConflictProgressKey(BASE_LOCAL_KEY, userId));
}

async function writeAccountProgress(userId: string, progress: ConflictProgress) {
  await writeStored(accountConflictProgressKey(BASE_LOCAL_KEY, userId), progress);
}

async function ensureConflictSettings(userId: string) {
  const existing = await supabase
    .from('conflict_journey_settings')
    .select('start_date,schedule_mode,last_reading_id,updated_at')
    .eq('user_id', userId)
    .eq('plan_id', CONFLICT_PLAN_ID)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { row: existing.data as ConflictSettingsRow, existed: true };

  const defaultSettings = {
    user_id: userId,
    plan_id: CONFLICT_PLAN_ID,
    start_date: todayISO(),
    schedule_mode: 'pace',
    last_reading_id: conflictPlan.readings[0].id,
  };
  const ensured = await supabase.from('conflict_journey_settings').upsert(defaultSettings, {
    onConflict: 'user_id,plan_id',
    ignoreDuplicates: true,
  });
  if (ensured.error) throw ensured.error;
  const selected = await supabase
    .from('conflict_journey_settings')
    .select('start_date,schedule_mode,last_reading_id,updated_at')
    .eq('user_id', userId)
    .eq('plan_id', CONFLICT_PLAN_ID)
    .maybeSingle();
  if (selected.error) throw selected.error;
  if (!selected.data) throw new Error('Your reading place could not be loaded.');
  return { row: selected.data as ConflictSettingsRow, existed: false };
}

async function writeRemoteSnapshot(progress: ConflictProgress, userId: string) {
  const normalized = normalize(progress);
  const { row: settings } = await ensureConflictSettings(userId);
  const reading = conflictPlan.readings[normalized.lastIndex] ?? conflictPlan.readings[0];
  const savedAt = normalized.updatedAt || new Date().toISOString();
  const [progressResult, settingsResult] = await Promise.all([
    supabase.from('reading_plan_progress').upsert({
      user_id: userId,
      plan_id: CONFLICT_PROGRESS_PLAN_ID,
      completed_indices: normalized.completed,
      last_index: normalized.lastIndex,
      updated_at: savedAt,
    }, { onConflict: 'user_id,plan_id' }),
    supabase.from('conflict_journey_settings').update({
      last_reading_id: reading.id,
      start_date: settings.start_date,
      schedule_mode: settings.schedule_mode,
    }).eq('user_id', userId).eq('plan_id', CONFLICT_PLAN_ID),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (settingsResult.error) throw settingsResult.error;
  return { ...normalized, updatedAt: savedAt };
}

function migrateLegacyProgress(rows: LegacyProgressRow[]) {
  const byReading = new Map(rows.map((row) => [row.reading_id, row]));
  const completed = new Set<number>();
  for (const reading of conflictPlan.readings) {
    const saved = byReading.get(reading.id);
    if (saved?.bible_complete) reading.bibleTasks.forEach((task) => completed.add(task.progressIndex));
    if (saved?.commentary_complete) reading.commentaryTasks.forEach((task) => completed.add(task.progressIndex));
  }
  return [...completed].sort((left, right) => left - right);
}

function legacyRowHasActivity(row: LegacyProgressRow) {
  return row.bible_complete
    || row.commentary_complete
    || Boolean(row.bible_opened_at || row.commentary_opened_at || row.completed_at);
}

type RemoteConflictProgress = {
  progress: ConflictProgress;
  accountDataExisted: boolean;
  needsPrimaryWrite: boolean;
};

async function loadRemoteProgress(userId: string): Promise<RemoteConflictProgress> {
  const [progressResult, settingsLoad, legacyResult] = await Promise.all([
    supabase.from('reading_plan_progress')
      .select('completed_indices,last_index,updated_at')
      .eq('user_id', userId)
      .eq('plan_id', CONFLICT_PROGRESS_PLAN_ID)
      .maybeSingle(),
    ensureConflictSettings(userId),
    supabase.from('conflict_reading_progress')
      .select('reading_id,bible_complete,commentary_complete,bible_opened_at,commentary_opened_at,completed_at,updated_at')
      .eq('user_id', userId)
      .eq('plan_id', CONFLICT_PLAN_ID),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (legacyResult.error) throw legacyResult.error;
  const settings = settingsLoad.row;
  const settingIndex = conflictReadingIndex(settings.last_reading_id);
  const legacyRows = (legacyResult.data ?? []) as LegacyProgressRow[];
  const legacyActivityExists = legacyRows.some(legacyRowHasActivity);

  if (progressResult.data) {
    const canonicalProgress = normalize(progressResult.data);
    const primaryProgress = {
      ...canonicalProgress,
      lastIndex: settingIndex >= 0 ? settingIndex : canonicalProgress.lastIndex,
      updatedAt: newestISO(canonicalProgress.updatedAt, settings.updated_at),
    };
    return {
      progress: primaryProgress,
      accountDataExisted: hasConflictAccountData(canonicalProgress, settingIndex, legacyActivityExists),
      needsPrimaryWrite: false,
    };
  }

  const legacyUpdatedAt = newestISO(...legacyRows.flatMap((row) => [
    row.updated_at,
    row.completed_at,
    row.bible_opened_at,
    row.commentary_opened_at,
  ]));
  // A settings row is created automatically. Its untouched first-reading
  // defaults are not evidence of an established journey and must not block a
  // non-empty guest journey from linking on first sign-in.
  const accountDataExisted = hasConflictAccountData(
    null,
    settingIndex,
    legacyActivityExists,
  );
  const migrated: ConflictProgress = {
    completed: migrateLegacyProgress(legacyRows),
    lastIndex: settingIndex >= 0 ? settingIndex : 0,
    updatedAt: accountDataExisted ? newestISO(settings.updated_at, legacyUpdatedAt) : '',
  };
  return {
    progress: migrated,
    accountDataExisted,
    needsPrimaryWrite: true,
  };
}

async function finishGuestLink(userId: string) {
  const target = await AsyncStorage.getItem(GUEST_LINK_TARGET_KEY);
  if (target !== userId) return;
  await writeGuestProgress(emptyConflictProgress());
  await AsyncStorage.removeItem(GUEST_LINK_TARGET_KEY);
}

export async function loadLocalConflictProgress(userId?: string) {
  if (!userId) return readGuestProgress();
  return await readAccountProgress(userId) ?? emptyConflictProgress();
}

export async function loadConflictProgress(userId?: string): Promise<ConflictProgress> {
  if (!userId) return readGuestProgress();

  const [accountLocal, remoteLoad, pendingLinkUserId] = await Promise.all([
    readAccountProgress(userId),
    loadRemoteProgress(userId),
    AsyncStorage.getItem(GUEST_LINK_TARGET_KEY),
  ]);
  const remote = remoteLoad.progress;
  let selected = selectConflictProgress(accountLocal, remote) ?? remote;
  const guest = await readGuestProgress();
  const linkGuest = shouldLinkGuestConflictProgress(
    accountLocal,
    remoteLoad.accountDataExisted ? remote : null,
    guest,
    pendingLinkUserId,
    userId,
  );
  if (linkGuest) {
    if (!pendingLinkUserId) await AsyncStorage.setItem(GUEST_LINK_TARGET_KEY, userId);
    selected = remoteLoad.accountDataExisted || accountLocal
      ? newerConflictProgress(selected, guest)
      : guest;
  }

  const remoteTime = Date.parse(remote.updatedAt || '1970-01-01T00:00:00.000Z');
  const selectedTime = Date.parse(selected.updatedAt || '1970-01-01T00:00:00.000Z');
  const saved = remoteLoad.needsPrimaryWrite || linkGuest || selectedTime > remoteTime
    ? await writeRemoteSnapshot({ ...selected, updatedAt: new Date().toISOString() }, userId)
    : selected;
  await writeAccountProgress(userId, saved);
  await finishGuestLink(userId);
  return saved;
}

export async function saveConflictProgress(
  input: Omit<ConflictProgress, 'updatedAt'> | ConflictProgress,
  userId?: string,
) {
  const normalized = normalize({
    completed: input.completed,
    lastIndex: input.lastIndex,
    updatedAt: new Date().toISOString(),
  });
  if (!userId) {
    await writeGuestProgress(normalized);
    const detachedTarget = await AsyncStorage.getItem(GUEST_LINK_TARGET_KEY);
    if (detachedTarget) await writeAccountProgress(detachedTarget, normalized);
    return normalized;
  }

  await writeAccountProgress(userId, normalized);
  return writeRemoteSnapshot(normalized, userId);
}

async function existingLegacyProgress(userId: string, readingId: string) {
  const result = await supabase.from('conflict_reading_progress')
    .select('reading_id,bible_complete,commentary_complete,bible_opened_at,commentary_opened_at,completed_at')
    .eq('user_id', userId)
    .eq('plan_id', CONFLICT_PLAN_ID)
    .eq('reading_id', readingId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as LegacyProgressRow | null;
}

export async function syncConflictReadingAggregate(
  userId: string,
  reading: ConflictReading,
  completed: ReadonlySet<number>,
  openedKind?: 'bible' | 'commentary',
) {
  const previous = await existingLegacyProgress(userId, reading.id);
  const now = new Date().toISOString();
  const bibleComplete = !reading.bibleReference
    || (reading.bibleTasks.length > 0 && reading.bibleTasks.every((task) => completed.has(task.progressIndex)));
  const commentaryComplete = !reading.commentaryCitation
    || (reading.commentaryTasks.length > 0 && reading.commentaryTasks.every((task) => completed.has(task.progressIndex)));
  const fullyComplete = conflictReadingComplete(reading, completed);
  const result = await supabase.from('conflict_reading_progress').upsert({
    user_id: userId,
    plan_id: CONFLICT_PLAN_ID,
    reading_id: reading.id,
    bible_complete: bibleComplete,
    commentary_complete: commentaryComplete,
    bible_opened_at: openedKind === 'bible' ? (previous?.bible_opened_at ?? now) : (previous?.bible_opened_at ?? null),
    commentary_opened_at: openedKind === 'commentary' ? (previous?.commentary_opened_at ?? now) : (previous?.commentary_opened_at ?? null),
    completed_at: fullyComplete ? (previous?.completed_at ?? now) : null,
    updated_at: now,
  }, { onConflict: 'user_id,plan_id,reading_id' });
  if (result.error) throw result.error;
}

export async function prepareConflictDetach(userId: string, requireFreshRemoteCopy = false) {
  let progress: ConflictProgress;
  try {
    progress = await loadConflictProgress(userId);
  } catch (error) {
    if (requireFreshRemoteCopy) throw error;
    progress = await loadLocalConflictProgress(userId);
  }
  await AsyncStorage.multiSet([
    [GUEST_LOCAL_KEY, JSON.stringify(progress)],
    [GUEST_LINK_TARGET_KEY, userId],
  ]);
  return progress;
}

export async function removeConflictAccountLocal(userId: string) {
  const target = await AsyncStorage.getItem(GUEST_LINK_TARGET_KEY);
  await AsyncStorage.multiRemove([
    accountConflictProgressKey(BASE_LOCAL_KEY, userId),
    ...(target === userId ? [GUEST_LINK_TARGET_KEY] : []),
  ]);
}

export async function clearConflictDeviceData() {
  const keys = await AsyncStorage.getAllKeys();
  const conflictKeys = keys.filter((key) => key.startsWith(`${BASE_LOCAL_KEY}:`));
  if (conflictKeys.length) await AsyncStorage.multiRemove(conflictKeys);
  return emptyConflictProgress();
}
