-- Run against the dedicated Conflict project. Every fixture is rolled back.
begin;
select set_config('test.conflict_user_a', gen_random_uuid()::text, true);
select set_config('test.conflict_user_b', gen_random_uuid()::text, true);
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
(current_setting('test.conflict_user_a')::uuid, 'authenticated', 'authenticated', current_setting('test.conflict_user_a') || '@example.invalid', '{"full_name":"Test Alpha"}'),
(current_setting('test.conflict_user_b')::uuid, 'authenticated', 'authenticated', current_setting('test.conflict_user_b') || '@example.invalid', '{"full_name":"Test Beta"}');

select set_config('request.jwt.claim.sub', current_setting('test.conflict_user_a'), true);
set local role authenticated;
insert into public.reading_plan_progress (user_id, plan_id, completed_indices)
values (auth.uid(), 'bible-conflict-ages-chapters-v1', array[0,1,2]);
select public.ensure_journey_profile();
select public.update_my_journey_first_name('Alpha');
select public.create_conflict_principle('bible-conflict-ages-v1', 'coa-001', 'A private principle');
select public.save_principle_map_layout('bible-conflict-ages-v1', '{"nodes":[]}');
do $test$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Profile RLS failed'; end if;
  if (select journey_points from public.get_conflict_journey_leaderboard() where is_current_user) <> 30 then raise exception 'Conflict scoring failed'; end if;
  begin
    insert into public.reading_plan_progress (user_id, plan_id, completed_indices)
    values (auth.uid(), 'chronological-bible-order-v4', array[0]);
    raise exception 'ChronBible plan was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.reading_plan_progress (user_id, plan_id, completed_indices)
    values (current_setting('test.conflict_user_b')::uuid, 'bible-conflict-ages-chapters-v1', array[0]);
    raise exception 'Cross-account write was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.journey_ensure_profile_for_user(current_setting('test.conflict_user_b')::uuid);
    raise exception 'Private helper was exposed';
  exception when insufficient_privilege then null;
  end;
end $test$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('test.conflict_user_b'), true);
set local role authenticated;
do $test$
begin
  if exists (select 1 from public.reading_plan_progress) then raise exception 'Progress leaked across users'; end if;
  if exists (select 1 from public.conflict_principles) then raise exception 'Principles leaked across users'; end if;
  if public.get_my_journey_first_name() = 'Alpha' then raise exception 'Profile edits leaked across users'; end if;
  if public.get_principle_map_layout('bible-conflict-ages-v1') <> '{}'::jsonb then raise exception 'Map layout leaked across users'; end if;
end $test$;
reset role;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
do $test$
begin
  begin
    perform * from public.profiles;
    raise exception 'Anonymous profile access was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.get_conflict_journey_leaderboard();
    raise exception 'Anonymous leaderboard access was accepted';
  exception when insufficient_privilege then null;
  end;
end $test$;
reset role;

-- Only synthetic users inside this rolled-back transaction are deleted.
delete from auth.users where id=current_setting('test.conflict_user_a')::uuid;
do $test$
begin
  if exists (select 1 from public.reading_plan_progress where user_id=current_setting('test.conflict_user_a')::uuid)
     or exists (select 1 from public.conflict_principles where user_id=current_setting('test.conflict_user_a')::uuid)
     or exists (select 1 from public.journey_reward_profiles where user_id=current_setting('test.conflict_user_a')::uuid)
  then raise exception 'Conflict deletion did not cascade'; end if;
  if not exists (select 1 from auth.users where id=current_setting('test.conflict_user_b')::uuid)
  then raise exception 'Deletion crossed account ownership'; end if;
end $test$;
rollback;
select 'PASS: ownership, scoring, plan isolation, anonymous restrictions and deletion cascade' as result;
