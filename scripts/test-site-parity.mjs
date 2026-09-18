import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localPlanPath = resolve(root, 'data', 'conflictPlan.json');
const manifest = JSON.parse(await readFile(resolve(root, 'data', 'siteParity.json'), 'utf8'));
const localBytes = await readFile(localPlanPath);
assert.equal(createHash('sha256').update(localBytes).digest('hex'), manifest.sha256);

const siblingSite = process.env.TJM_SITE_ROOT
  ? resolve(process.env.TJM_SITE_ROOT, 'bibleandconflictoftheages')
  : resolve(root, '..', 'tjm-site', 'bibleandconflictoftheages');
try {
  await access(resolve(siblingSite, 'data', 'readings.json'), constants.R_OK);
  const siteBytes = await readFile(resolve(siblingSite, 'data', 'readings.json'));
  assert.deepEqual(localBytes, siteBytes, 'The app snapshot must be byte-identical to the checked-out website plan');
  const siteRuntime = await readFile(resolve(siblingSite, 'app.js'), 'utf8');
  assert.match(siteRuntime, /plan_id: CONFIG\.planId/u);
  assert.match(siteRuntime, /bible-conflict-ages-chapters-v1/u);
  assert.match(siteRuntime, /get_conflict_journey_leaderboard/u);
  assert.match(siteRuntime, /prepareChapterProgressIndex/u);
  console.log('Checked-out website and native app plan/sync contract parity passed.');
} catch (error) {
  if (error?.code !== 'ENOENT' || process.env.TJM_SITE_ROOT) throw error;
  console.log('Canonical website snapshot hash and documented sync contract passed (website checkout not present).');
}
