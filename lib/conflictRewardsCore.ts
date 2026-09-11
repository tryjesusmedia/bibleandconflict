export const CONFLICT_POINTS_PER_ITEM = 10;
export const CONFLICT_TOTAL_ITEMS = 1696;
export const CONFLICT_MILESTONES = [1, 25, 100, 250, 500, 750, 1000, 1696] as const;

export type ConflictRewardSummary = {
  completedItems: number;
  journeyPoints: number;
  currentMilestone: number | null;
  nextMilestone: number | null;
  itemsUntilNextMilestone: number;
  nextMilestoneProgress: number;
};

export type ConflictLeaderboardEntry = {
  rank: number;
  alias: string;
  journeyPoints: number;
  completedItems: number;
  isCurrentUser: boolean;
};

export function distinctConflictIndices(value: readonly unknown[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((index): index is number => (
    typeof index === 'number'
    && Number.isInteger(index)
    && index >= 0
    && index < CONFLICT_TOTAL_ITEMS
  )))).sort((left, right) => left - right);
}
export function summarizeConflictRewards(value: readonly unknown[] | null | undefined): ConflictRewardSummary {
  const completedItems = distinctConflictIndices(value).length;
  const currentMilestone = [...CONFLICT_MILESTONES].reverse().find((milestone) => milestone <= completedItems) ?? null;
  const nextMilestone = CONFLICT_MILESTONES.find((milestone) => milestone > completedItems) ?? null;
  return {
    completedItems,
    journeyPoints: completedItems * CONFLICT_POINTS_PER_ITEM,
    currentMilestone,
    nextMilestone,
    itemsUntilNextMilestone: nextMilestone ? nextMilestone - completedItems : 0,
    nextMilestoneProgress: nextMilestone ? completedItems / nextMilestone : 1,
  };
}

function integer(value: unknown) {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function normalizeConflictLeaderboard(value: unknown): ConflictLeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap<ConflictLeaderboardEntry>((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const row = candidate as Record<string, unknown>;
    const rank = integer(row.rank);
    const points = integer(row.journey_points);
    const items = integer(row.completed_chapters);
    const alias = typeof row.alias === 'string' ? row.alias.trim() : '';
    if (
      rank === null || rank < 1
      || points === null || points < 0 || points > CONFLICT_TOTAL_ITEMS * CONFLICT_POINTS_PER_ITEM
      || items === null || items < 0 || items > CONFLICT_TOTAL_ITEMS
      || points !== items * CONFLICT_POINTS_PER_ITEM
      || !alias
      || typeof row.is_current_user !== 'boolean'
    ) return [];
    return [{
      rank,
      alias,
      journeyPoints: points,
      completedItems: items,
      isCurrentUser: row.is_current_user,
    }];
  }).sort((left, right) => left.rank - right.rank || left.alias.localeCompare(right.alias));
}
