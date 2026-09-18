// Generate transactional DML for the ONE-TIME import into an empty Conflict project.
// Input and generated SQL contain private data: never log, commit, or publish them.
// Execute with a privileged SQL connection to TARGET_PROJECT only. Dry run first.
export const TARGET_PROJECT = 'gabufylczphhykudwzbc';
export const TABLES = [
  'profiles', 'journey_reward_profiles', 'reading_plan_progress',
  'conflict_journey_settings', 'conflict_reading_progress', 'conflict_principles',
  'conflict_principle_map_layouts', 'bible_highlights', 'conflict_discussion_posts',
  'conflict_discussion_replies', 'journey_leaderboard_blocks', 'journey_leaderboard_reports',
];
const USER_FIELDS = ['id','instance_id','aud','role','email','email_confirmed_at',
  'raw_app_meta_data','raw_user_meta_data','created_at','updated_at','banned_until',
  'is_sso_user','is_anonymous'];
const IDENTITY_FIELDS = ['id','provider_id','user_id','identity_data','provider','created_at','updated_at'];
function check(condition, message) { if (!condition) throw new Error(message); }
function exactKeys(object, expected) {
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...expected].sort());
}
export function buildImportSQL(snapshot, {projectId, commit = false} = {}) {
  check(projectId === TARGET_PROJECT, 'Wrong destination project');
  check(snapshot.source_project === 'erejehmrtzjpqurbftsm', 'Wrong source project');
  check(exactKeys(snapshot.tables, TABLES), 'Unexpected table set');
  check(snapshot.auth_users.length > 0, 'Empty account snapshot');
  const users = new Set(snapshot.auth_users.map(u => u.id));
  check(users.size === snapshot.auth_users.length, 'Duplicate accounts');
  for (const u of snapshot.auth_users) {
    check(exactKeys(u, USER_FIELDS), 'Unexpected auth fields; never copy credentials');
    check(u.role === 'authenticated' && u.aud === 'authenticated' && !u.is_anonymous && !u.is_sso_user, 'Unsupported account');
    check(u.raw_app_meta_data?.provider === 'google' && u.raw_app_meta_data?.providers?.every(p => p === 'google'), 'Non-Google account');
  }
  const identities = new Set();
  for (const i of snapshot.auth_identities) {
    check(exactKeys(i, IDENTITY_FIELDS), 'Unexpected identity fields');
    check(i.provider === 'google' && users.has(i.user_id), 'Unsupported identity');
    check(i.identity_data?.sub === i.provider_id, 'Google identity subject mismatch');
    identities.add(i.user_id);
  }
  check(identities.size === users.size, 'Missing Google identity');
  for (const table of TABLES) {
    check(Array.isArray(snapshot.tables[table]), 'Invalid table rows');
    for (const row of snapshot.tables[table]) {
      const ownerFields = table === 'profiles' ? ['id'] : Object.keys(row).filter(k => k.endsWith('user_id'));
      check(ownerFields.length > 0 && ownerFields.every(k => users.has(row[k])), 'Row outside participant scope');
      if ('plan_id' in row) check(row.plan_id === 'bible-conflict-ages-v1' ||
        (table === 'reading_plan_progress' && row.plan_id === 'bible-conflict-ages-chapters-v1'), 'Non-Conflict plan');
    }
  }
  // Identity triggers intentionally enforce current-user attribution. A nonempty
  // discussion needs a separately reviewed import, never silently rewritten authors.
  check(snapshot.tables.conflict_discussion_posts.length === 0 && snapshot.tables.conflict_discussion_replies.length === 0,
    'Discussion rows require a reviewed attribution-preserving importer');
  const data = JSON.stringify(snapshot);
  let delimiter = '$conflict_import$';
  while (data.includes(delimiter)) delimiter = delimiter.slice(0, -1) + '_$';
  const literal = "'" + data.replaceAll("'", "''") + "'::jsonb";
  const cols = USER_FIELDS.join(',');
  const icols = IDENTITY_FIELDS.join(',');
  const tableArray = 'array[' + TABLES.map(t => "'" + t + "'").join(',') + ']';
  return `begin;
set local standard_conforming_strings = on;
set local lock_timeout = '5s';
lock table auth.users, auth.identities, ${TABLES.map(t => 'public.' + t).join(', ')} in share row exclusive mode;
do ${delimiter}
declare
  s jsonb := ${literal};
  t text;
  n bigint;
  actual jsonb;
  expected jsonb;
begin
  if exists(select 1 from auth.users) or exists(select 1 from auth.identities)
    or exists(select 1 from auth.sessions) or exists(select 1 from auth.refresh_tokens) then
    raise exception 'Target auth is not empty; refusing overwrite';
  end if;
  foreach t in array ${tableArray} loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception 'Target table % is not empty', t; end if;
  end loop;
  insert into auth.users (${cols},encrypted_password,confirmation_token,recovery_token,email_change_token_new,email_change,is_super_admin)
    select ${cols},'','','','','',false
    from jsonb_populate_recordset(null::auth.users,s->'auth_users');
  insert into auth.identities (${icols})
    select ${icols} from jsonb_populate_recordset(null::auth.identities,s->'auth_identities');
  -- Only rows just created by signup triggers can exist after the empty-target guard.
  delete from public.profiles where id in (select id from jsonb_populate_recordset(null::auth.users,s->'auth_users'));
  delete from public.journey_reward_profiles where user_id in (select id from jsonb_populate_recordset(null::auth.users,s->'auth_users'));
  foreach t in array ${tableArray} loop
    execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1)',t,t) using s->'tables'->t;
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from public.%I r',t) into actual;
    select coalesce(jsonb_agg(value order by value::text),'[]'::jsonb) into expected from jsonb_array_elements(s->'tables'->t);
    if actual is distinct from expected then raise exception 'Exact row verification failed for %',t; end if;
  end loop;
  select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) into actual from (select ${cols} from auth.users) r;
  select jsonb_agg(value order by value::text) into expected from jsonb_array_elements(s->'auth_users');
  if actual is distinct from expected then raise exception 'Auth account verification failed'; end if;
  select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) into actual from (select ${icols} from auth.identities) r;
  select jsonb_agg(value order by value::text) into expected from jsonb_array_elements(s->'auth_identities');
  if actual is distinct from expected then raise exception 'Auth identity verification failed'; end if;
  if exists(select 1 from auth.sessions) or exists(select 1 from auth.refresh_tokens) then
    raise exception 'Unexpected session material';
  end if;
end ${delimiter};
select 'verified' as result, (select count(*) from auth.users) as accounts,
  (select count(*) from auth.identities) as google_identities,
  (select count(*) from public.conflict_reading_progress) as progress_rows;
${commit ? 'commit' : 'rollback'};`;
}
