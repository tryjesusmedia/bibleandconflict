-- Read only: export the Conflict subset from erejehmrtzjpqurbftsm.
-- Contains private account/progress data: keep output out of git and logs.
-- Do not transfer session, refresh-token, password or signing-key material.
with participants as (
  select user_id from public.reading_plan_progress where plan_id in ('bible-conflict-ages-v1','bible-conflict-ages-chapters-v1')
  union
  select user_id from public.conflict_journey_settings where plan_id = 'bible-conflict-ages-v1'
  union
  select user_id from public.conflict_reading_progress where plan_id = 'bible-conflict-ages-v1'
  union
  select user_id from public.conflict_principles where plan_id = 'bible-conflict-ages-v1'
  union
  select user_id from public.conflict_principle_map_layouts where plan_id = 'bible-conflict-ages-v1'
  union
  select user_id from public.conflict_discussion_posts where plan_id = 'bible-conflict-ages-v1'
  union
  select user_id from public.bible_highlights where plan_id = 'bible-conflict-ages-v1'
  union
  select reply.user_id from public.conflict_discussion_replies reply join public.conflict_discussion_posts post on post.id=reply.post_id where post.plan_id='bible-conflict-ages-v1'
), active_participants as (
  select u.id from auth.users u join participants p on p.user_id=u.id where u.deleted_at is null
)
select jsonb_build_object(
  'source_project', 'erejehmrtzjpqurbftsm',
  'snapshot_at', transaction_timestamp(),
  'auth_users', (select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) from (
    select id, instance_id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      banned_until, is_sso_user, is_anonymous
    from auth.users where id in (select id from active_participants)
  ) u),
  'auth_identities', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from (
    select id, provider_id, user_id, identity_data, provider, created_at, updated_at
    from auth.identities where user_id in (select id from active_participants)
  ) i),
  'tables', jsonb_build_object(
    'profiles', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.profiles r where id in (select id from active_participants)),
    'reading_plan_progress', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.reading_plan_progress r where plan_id in ('bible-conflict-ages-v1','bible-conflict-ages-chapters-v1') and user_id in (select id from active_participants)),
    'conflict_journey_settings', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_journey_settings r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'conflict_reading_progress', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_reading_progress r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'conflict_principles', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_principles r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'conflict_principle_map_layouts', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_principle_map_layouts r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'conflict_discussion_posts', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_discussion_posts r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'conflict_discussion_replies', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.conflict_discussion_replies r where post_id in (select id from public.conflict_discussion_posts where plan_id='bible-conflict-ages-v1' and user_id in (select id from active_participants)) and user_id in (select id from active_participants)),
    'bible_highlights', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.bible_highlights r where plan_id = 'bible-conflict-ages-v1' and user_id in (select id from active_participants)),
    'journey_reward_profiles', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.journey_reward_profiles r where user_id in (select id from active_participants)),
    'journey_leaderboard_blocks', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.journey_leaderboard_blocks r where blocker_user_id in (select id from active_participants) and blocked_user_id in (select id from active_participants)),
    'journey_leaderboard_reports', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.journey_leaderboard_reports r where reporter_user_id in (select id from active_participants) and reported_user_id in (select id from active_participants))
  )
) as snapshot;
