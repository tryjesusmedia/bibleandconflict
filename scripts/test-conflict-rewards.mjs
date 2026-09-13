import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CONFLICT_MILESTONES,
  CONFLICT_POINTS_PER_ITEM,
  CONFLICT_TOTAL_ITEMS,
  distinctConflictIndices,
  normalizeConflictLeaderboard,
  summarizeConflictRewards,
} from '../lib/conflictRewardsCore.ts';

assert.equal(CONFLICT_POINTS_PER_ITEM, 10);
assert.equal(CONFLICT_TOTAL_ITEMS, 1696);
assert.deepEqual([...CONFLICT_MILESTONES], [1, 25, 100, 250, 500, 750, 1000, 1696]);
assert.deepEqual(distinctConflictIndices([1695, 0, 0, -1, 1696, 1.5, null, true, '2']), [0, 1695]);
assert.deepEqual(summarizeConflictRewards([]), {
  completedItems: 0, journeyPoints: 0, currentMilestone: null, nextMilestone: 1, itemsUntilNextMilestone: 1, nextMilestoneProgress: 0,
});
assert.equal(summarizeConflictRewards(Array.from({ length: 1696 }, (_, index) => index)).journeyPoints, 16960);

const rows = normalizeConflictLeaderboard([
  { rank: '2', alias: ' Quiet Harbor ', journey_points: 250, completed_chapters: 25, is_current_user: true, user_id: 'secret', email: 'secret@example.com' },
  { rank: 1, alias: 'Cedar Lamp', journey_points: 1000, completed_chapters: 100, is_current_user: false },
  { rank: 0, alias: 'Invalid', journey_points: 0, completed_chapters: 0, is_current_user: false },
  { rank: 3, alias: 'Mismatch', journey_points: 12, completed_chapters: 1, is_current_user: false },
]);
assert.deepEqual(rows, [
  { rank: 1, alias: 'Cedar Lamp', journeyPoints: 1000, completedItems: 100, isCurrentUser: false },
  { rank: 2, alias: 'Quiet Harbor', journeyPoints: 250, completedItems: 25, isCurrentUser: true },
]);
assert.deepEqual(Object.keys(rows[1]).sort(), ['rank', 'alias', 'journeyPoints', 'completedItems', 'isCurrentUser'].sort(), 'Private server fields must not reach UI models');

const component = await readFile(new URL('../components/ConflictLeaderboard.tsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../lib/conflictRewards.ts', import.meta.url), 'utf8');
assert.match(service, /ensure_journey_profile/u);
assert.match(service, /update_journey_alias/u);
assert.match(service, /get_conflict_journey_leaderboard/u);
assert.match(service, /get_my_journey_first_name/u);
assert.match(service, /update_my_journey_first_name/u);
assert.match(component, /delayLongPress=\{1400\}/u);
assert.match(component, /now - lastTap\.current <= 450/u);
assert.match(component, /now - lastAliasTap\.current <= 450/u);
assert.doesNotMatch(component, />Change alias</u);
assert.match(component, /accessibilityState=\{\{ expanded: leaderboardOpen \}\}/u);
assert.doesNotMatch(component, /RefreshControl|Refresh leaderboard|Your community alias/iu);
assert.match(component, /useFocusEffect/u);
assert.match(component, /AppState\.addEventListener/u);

console.log('Journey Points, privacy-safe leaderboard, auto-refresh, private welcome name, and alias controls passed.');
