export type ConflictProgress = {
  completed: number[];
  lastIndex: number;
  updatedAt: string;
};

export type StoredConflictProgress = {
  completed_indices?: unknown;
  completed?: unknown;
  last_index?: unknown;
  lastIndex?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
};

export function emptyConflictProgress(): ConflictProgress {
  return { completed: [], lastIndex: 0, updatedAt: '' };
}

export function normalizeConflictProgress(
  input: StoredConflictProgress | null | undefined,
  taskCount = 1696,
  readingCount = 264,
): ConflictProgress {
  const rawCompleted = Array.isArray(input?.completed_indices)
    ? input.completed_indices
    : Array.isArray(input?.completed)
      ? input.completed
      : [];
  const completed = Array.from(new Set(rawCompleted
    .filter((index): index is number => (
      typeof index === 'number'
      && Number.isInteger(index)
      && index >= 0
      && index < taskCount
    ))))
    .sort((left, right) => left - right);
  const lastCandidate = Number(input?.last_index ?? input?.lastIndex ?? 0);
  const lastIndex = Number.isInteger(lastCandidate)
    ? Math.max(0, Math.min(lastCandidate, readingCount - 1))
    : 0;
  return {
    completed,
    lastIndex,
    updatedAt: String(input?.updated_at ?? input?.updatedAt ?? ''),
  };
}

export function hasConflictProgress(progress: ConflictProgress) {
  return Boolean(progress.updatedAt) || progress.completed.length > 0 || progress.lastIndex > 0;
}

export function hasConflictJourneyActivity(progress: ConflictProgress | null) {
  return Boolean(progress && (progress.completed.length > 0 || progress.lastIndex > 0));
}

export function hasConflictAccountData(
  primaryProgress: ConflictProgress | null,
  settingIndex: number,
  legacyActivityExists: boolean,
) {
  return hasConflictJourneyActivity(primaryProgress) || settingIndex > 0 || legacyActivityExists;
}

function timestamp(value: string) {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function newerConflictProgress(left: ConflictProgress, right: ConflictProgress) {
  return timestamp(left.updatedAt) > timestamp(right.updatedAt) ? left : right;
}

export function selectConflictProgress(
  local: ConflictProgress | null,
  remote: ConflictProgress | null,
) {
  // These are whole snapshots with one timestamp, not per-item operations.
  // Choosing the newer snapshot preserves an intentional uncheck. A union
  // would silently re-complete items removed by the newer snapshot.
  if (local && remote) return newerConflictProgress(local, remote);
  return local ?? remote;
}

export function guestConflictProgressKey(baseKey: string) {
  return `${baseKey}:guest`;
}

export function accountConflictProgressKey(baseKey: string, userId: string) {
  return `${baseKey}:user:${userId}`;
}

export function shouldLinkGuestConflictProgress(
  accountLocal: ConflictProgress | null,
  remote: ConflictProgress | null,
  guest: ConflictProgress,
  pendingLinkUserId: string | null,
  userId: string,
) {
  const firstLink = !pendingLinkUserId
    && !hasConflictJourneyActivity(accountLocal)
    && !hasConflictJourneyActivity(remote);
  const targetedReconnect = pendingLinkUserId === userId;
  return hasConflictProgress(guest) && (firstLink || targetedReconnect);
}

export function conflictLoadIdentity(userId?: string) {
  return userId ? `user:${userId}` : 'guest';
}

export function isConflictLoadCurrent(
  generation: number,
  currentGeneration: number,
  identity: string,
  currentUserId: string | undefined,
  authLoading: boolean,
) {
  return !authLoading
    && generation === currentGeneration
    && identity === conflictLoadIdentity(currentUserId);
}
