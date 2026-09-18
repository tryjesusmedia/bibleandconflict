-- Bible and Conflict ONLY. Never apply this baseline to the Journey project.

-- Snapshot of the live reading schema, with separate auth, private helpers,

-- authenticated-only grants and Conflict-only plan constraints. No user data.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

grant usage on schema private to service_role;

revoke create on schema public from public, anon, authenticated;

set check_function_bodies = off;

create table public."profiles" (
  "id" uuid not null,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamp with time zone default now()
);

alter table public."profiles" enable row level security;

create table public."reading_plan_progress" (
  "user_id" uuid not null,
  "plan_id" text not null,
  "completed_indices" integer[] default '{}'::integer[] not null,
  "last_index" integer default 0 not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."reading_plan_progress" enable row level security;

create table public."conflict_journey_settings" (
  "user_id" uuid not null,
  "plan_id" text not null,
  "start_date" date default CURRENT_DATE not null,
  "schedule_mode" text default 'pace'::text not null,
  "last_reading_id" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."conflict_journey_settings" enable row level security;

create table public."conflict_reading_progress" (
  "user_id" uuid not null,
  "plan_id" text not null,
  "reading_id" text not null,
  "bible_complete" boolean default false not null,
  "commentary_complete" boolean default false not null,
  "bible_opened_at" timestamp with time zone,
  "commentary_opened_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."conflict_reading_progress" enable row level security;

create table public."conflict_principles" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" text not null,
  "reading_id" text not null,
  "principle_number" integer not null,
  "body" text not null,
  "cross_reference_numbers" integer[] default '{}'::integer[] not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "group_id" uuid,
  "group_title" text,
  "deleted_at" timestamp with time zone,
  "principle_name" text,
  "client_mutation_id" uuid
);

alter table public."conflict_principles" enable row level security;

create table public."conflict_principle_map_layouts" (
  "user_id" uuid not null,
  "plan_id" text not null,
  "layout" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."conflict_principle_map_layouts" enable row level security;

create table public."conflict_discussion_posts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" text not null,
  "reading_id" text not null,
  "principle_id" uuid,
  "principle_number" integer,
  "principle_body" text,
  "body" text not null,
  "author_name" text not null,
  "author_avatar_url" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."conflict_discussion_posts" enable row level security;

create table public."conflict_discussion_replies" (
  "id" uuid default gen_random_uuid() not null,
  "post_id" uuid not null,
  "user_id" uuid not null,
  "body" text not null,
  "author_name" text not null,
  "author_avatar_url" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."conflict_discussion_replies" enable row level security;

create table public."bible_highlights" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" text not null,
  "reading_id" text not null,
  "translation" text not null,
  "chapter_label" text not null,
  "start_offset" integer not null,
  "end_offset" integer not null,
  "selected_text" text not null,
  "color" text not null,
  "note" text default ''::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "client_mutation_id" uuid not null,
  "deleted_at" timestamp with time zone
);

alter table public."bible_highlights" enable row level security;

create table public."journey_reward_profiles" (
  "user_id" uuid not null,
  "alias" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "alias_changed_at" timestamp with time zone,
  "first_name" text default 'Friend'::text not null
);

alter table public."journey_reward_profiles" enable row level security;

create table public."journey_leaderboard_blocks" (
  "blocker_user_id" uuid not null,
  "blocked_user_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);

alter table public."journey_leaderboard_blocks" enable row level security;

create table public."journey_leaderboard_reports" (
  "id" bigint generated by default as identity not null,
  "reporter_user_id" uuid not null,
  "reported_user_id" uuid not null,
  "reported_alias" text not null,
  "reason" text not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "reviewed_at" timestamp with time zone,
  "moderator_note" text
);

alter table public."journey_leaderboard_reports" enable row level security;

alter table public."bible_highlights" add constraint "bible_highlights_check" CHECK ((end_offset > start_offset));

alter table public."bible_highlights" add constraint "bible_highlights_color_check" CHECK ((color = ANY (ARRAY['yellow'::text, 'orange'::text, 'red'::text, 'green'::text, 'cyan'::text, 'purple'::text])));

alter table public."bible_highlights" add constraint "bible_highlights_pkey" PRIMARY KEY (id);

alter table public."bible_highlights" add constraint "bible_highlights_selected_text_check" CHECK ((length(btrim(selected_text)) > 0));

alter table public."bible_highlights" add constraint "bible_highlights_start_offset_check" CHECK ((start_offset >= 0));

alter table public."bible_highlights" add constraint "bible_highlights_translation_check" CHECK ((translation = ANY (ARRAY['KJV'::text, 'WEB'::text])));

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_author_name_check" CHECK (((char_length(author_name) >= 1) AND (char_length(author_name) <= 120)));

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_body_check" CHECK (((char_length(body) >= 3) AND (char_length(body) <= 2000)));

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_pkey" PRIMARY KEY (id);

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_principle_body_check" CHECK (((principle_body IS NULL) OR (char_length(principle_body) <= 2000)));

alter table public."conflict_discussion_replies" add constraint "conflict_discussion_replies_author_name_check" CHECK (((char_length(author_name) >= 1) AND (char_length(author_name) <= 120)));

alter table public."conflict_discussion_replies" add constraint "conflict_discussion_replies_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000)));

alter table public."conflict_discussion_replies" add constraint "conflict_discussion_replies_pkey" PRIMARY KEY (id);

alter table public."conflict_journey_settings" add constraint "conflict_journey_settings_pkey" PRIMARY KEY (user_id, plan_id);

alter table public."conflict_journey_settings" add constraint "conflict_journey_settings_schedule_mode_check" CHECK ((schedule_mode = ANY (ARRAY['pace'::text, 'calendar'::text])));

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_object" CHECK ((jsonb_typeof(layout) = 'object'::text));

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_pkey" PRIMARY KEY (user_id, plan_id);

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_plan_length" CHECK (((char_length(plan_id) >= 1) AND (char_length(plan_id) <= 120)));

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_size" CHECK ((octet_length((layout)::text) <= 2000000));

alter table public."conflict_principles" add constraint "conflict_principles_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)));

alter table public."conflict_principles" add constraint "conflict_principles_group_title_length" CHECK (((group_title IS NULL) OR (char_length(group_title) <= 80)));

alter table public."conflict_principles" add constraint "conflict_principles_name_length" CHECK (((principle_name IS NULL) OR ((char_length(principle_name) >= 1) AND (char_length(principle_name) <= 120))));

alter table public."conflict_principles" add constraint "conflict_principles_pkey" PRIMARY KEY (id);

alter table public."conflict_principles" add constraint "conflict_principles_principle_number_check" CHECK ((principle_number > 0));

alter table public."conflict_principles" add constraint "conflict_principles_user_id_plan_id_principle_number_key" UNIQUE (user_id, plan_id, principle_number);

alter table public."conflict_reading_progress" add constraint "conflict_reading_progress_pkey" PRIMARY KEY (user_id, plan_id, reading_id);

alter table public."journey_leaderboard_blocks" add constraint "journey_leaderboard_blocks_not_self" CHECK ((blocker_user_id <> blocked_user_id));

alter table public."journey_leaderboard_blocks" add constraint "journey_leaderboard_blocks_pkey" PRIMARY KEY (blocker_user_id, blocked_user_id);

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_alias_length" CHECK (((char_length(reported_alias) >= 3) AND (char_length(reported_alias) <= 40)));

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_not_self" CHECK ((reporter_user_id <> reported_user_id));

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_pkey" PRIMARY KEY (id);

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_reason_valid" CHECK ((reason = ANY (ARRAY['offensive_name'::text, 'impersonation'::text, 'spam'::text, 'other'::text])));

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_reporter_user_id_reported_user__key" UNIQUE (reporter_user_id, reported_user_id, reported_alias, reason);

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_status_valid" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'actioned'::text, 'dismissed'::text])));

alter table public."journey_reward_profiles" add constraint "journey_reward_profiles_alias_length" CHECK (((char_length(alias) >= 3) AND (char_length(alias) <= 40)));

alter table public."journey_reward_profiles" add constraint "journey_reward_profiles_first_name_valid" CHECK (((first_name = btrim(first_name)) AND ((char_length(first_name) >= 1) AND (char_length(first_name) <= 40)) AND (first_name !~ '[[:cntrl:]<>]'::text)));

alter table public."journey_reward_profiles" add constraint "journey_reward_profiles_pkey" PRIMARY KEY (user_id);

alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);

alter table public."reading_plan_progress" add constraint "reading_plan_progress_pkey" PRIMARY KEY (user_id, plan_id);

alter table public."bible_highlights" add constraint "bible_highlights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_principle_id_fkey" FOREIGN KEY (principle_id) REFERENCES conflict_principles(id) ON DELETE SET NULL;

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_discussion_replies" add constraint "conflict_discussion_replies_post_id_fkey" FOREIGN KEY (post_id) REFERENCES conflict_discussion_posts(id) ON DELETE CASCADE;

alter table public."conflict_discussion_replies" add constraint "conflict_discussion_replies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_journey_settings" add constraint "conflict_journey_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_principles" add constraint "conflict_principles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."conflict_reading_progress" add constraint "conflict_reading_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."journey_leaderboard_blocks" add constraint "journey_leaderboard_blocks_blocked_user_id_fkey" FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."journey_leaderboard_blocks" add constraint "journey_leaderboard_blocks_blocker_user_id_fkey" FOREIGN KEY (blocker_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_reported_user_id_fkey" FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."journey_leaderboard_reports" add constraint "journey_leaderboard_reports_reporter_user_id_fkey" FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."journey_reward_profiles" add constraint "journey_reward_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."reading_plan_progress" add constraint "reading_plan_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX bible_highlights_user_mutation_unique ON public.bible_highlights USING btree (user_id, client_mutation_id);

CREATE INDEX bible_highlights_user_created_index ON public.bible_highlights USING btree (user_id, created_at DESC);

CREATE INDEX conflict_progress_plan_idx ON public.conflict_reading_progress USING btree (plan_id, reading_id);

CREATE INDEX conflict_posts_plan_created_idx ON public.conflict_discussion_posts USING btree (plan_id, created_at DESC);

CREATE INDEX conflict_replies_post_created_idx ON public.conflict_discussion_replies USING btree (post_id, created_at);

CREATE INDEX conflict_principles_user_idx ON public.conflict_principles USING btree (user_id, plan_id, principle_number);

CREATE INDEX conflict_principles_group_idx ON public.conflict_principles USING btree (user_id, plan_id, group_id) WHERE (group_id IS NOT NULL);

CREATE INDEX conflict_principles_deleted_idx ON public.conflict_principles USING btree (user_id, plan_id, deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE UNIQUE INDEX conflict_principles_client_mutation_idx ON public.conflict_principles USING btree (user_id, plan_id, client_mutation_id) WHERE (client_mutation_id IS NOT NULL);

CREATE UNIQUE INDEX journey_reward_profiles_alias_unique ON public.journey_reward_profiles USING btree (lower(alias));

CREATE INDEX journey_leaderboard_blocks_blocked_user_idx ON public.journey_leaderboard_blocks USING btree (blocked_user_id);

CREATE INDEX journey_leaderboard_reports_review_queue_idx ON public.journey_leaderboard_reports USING btree (status, created_at);

alter table public."reading_plan_progress" add constraint "reading_plan_progress_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1', 'bible-conflict-ages-chapters-v1'));

alter table public."conflict_journey_settings" add constraint "conflict_journey_settings_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

alter table public."conflict_reading_progress" add constraint "conflict_reading_progress_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

alter table public."conflict_principles" add constraint "conflict_principles_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

alter table public."conflict_principle_map_layouts" add constraint "conflict_principle_map_layouts_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

alter table public."conflict_discussion_posts" add constraint "conflict_discussion_posts_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

alter table public."bible_highlights" add constraint "bible_highlights_conflict_plan_only" check (plan_id in ('bible-conflict-ages-v1'));

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$function$;

revoke all on function private."handle_new_user"() from public, anon, authenticated;

grant execute on function private."handle_new_user"() to service_role;

CREATE OR REPLACE FUNCTION private.touch_conflict_journey_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private."touch_conflict_journey_updated_at"() from public, anon, authenticated;

grant execute on function private."touch_conflict_journey_updated_at"() to service_role;

CREATE OR REPLACE FUNCTION private.set_conflict_discussion_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  metadata jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
begin
  new.user_id = auth.uid();
  new.author_name = left(coalesce(nullif(metadata ->> 'full_name', ''), nullif(metadata ->> 'name', ''), 'Try Jesus member'), 120);
  new.author_avatar_url = coalesce(nullif(metadata ->> 'avatar_url', ''), nullif(metadata ->> 'picture', ''));
  return new;
end;
$function$;

revoke all on function private."set_conflict_discussion_identity"() from public, anon, authenticated;

grant execute on function private."set_conflict_discussion_identity"() to service_role;

CREATE OR REPLACE FUNCTION public.update_conflict_principle(p_principle_id uuid, p_principle_number integer, p_body text, p_cross_reference_numbers integer[] DEFAULT '{}'::integer[])
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  existing public.conflict_principles;
  old_number integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into existing
  from public.conflict_principles
  where id = p_principle_id and user_id = current_user_id;
  if not found then raise exception 'Principle not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || existing.plan_id, 0));
  old_number := existing.principle_number;

  if p_principle_number is null or p_principle_number < 1 then
    raise exception 'Principle number must be a whole number greater than zero';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 2000 then
    raise exception 'Principle must be between 1 and 2000 characters';
  end if;
  if exists (
    select 1 from public.conflict_principles other
    where other.user_id = current_user_id
      and other.plan_id = existing.plan_id
      and other.id <> p_principle_id
      and other.principle_number = p_principle_number
  ) then
    raise exception 'Principle #% is already in use', p_principle_number;
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_cross_reference_numbers, '{}')) as requested(number)
    where requested.number <= 0
      or not (
        requested.number = p_principle_number
        or exists (
          select 1 from public.conflict_principles other
          where other.user_id = current_user_id
            and other.plan_id = existing.plan_id
            and other.id <> p_principle_id
            and other.principle_number = requested.number
        )
      )
  ) then
    raise exception 'Every cross-reference must identify one of your existing principles';
  end if;

  if old_number <> p_principle_number then
    update public.conflict_principles principle
    set cross_reference_numbers = array(
      select distinct case when ref.number = old_number then p_principle_number else ref.number end
      from unnest(principle.cross_reference_numbers) as ref(number)
      order by 1
    )
    where principle.user_id = current_user_id
      and principle.plan_id = existing.plan_id
      and old_number = any(principle.cross_reference_numbers);
  end if;

  update public.conflict_principles
  set principle_number = p_principle_number,
      body = trim(p_body),
      cross_reference_numbers = array(
        select distinct ref.number
        from unnest(coalesce(p_cross_reference_numbers, '{}')) as ref(number)
        order by ref.number
      )
  where id = p_principle_id and user_id = current_user_id;

  return query
    select * from public.conflict_principles
    where user_id = current_user_id and plan_id = existing.plan_id
    order by principle_number;
end;
$function$;

revoke all on function public."update_conflict_principle"(p_principle_id uuid, p_principle_number integer, p_body text, p_cross_reference_numbers integer[]) from public, anon, authenticated;

grant execute on function public."update_conflict_principle"(p_principle_id uuid, p_principle_number integer, p_body text, p_cross_reference_numbers integer[]) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.move_conflict_principle(p_principle_id uuid, p_target_principle_id uuid DEFAULT NULL::uuid, p_standalone boolean DEFAULT false)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  source_principle public.conflict_principles;
  target_principle public.conflict_principles;
  destination_group uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into source_principle
  from public.conflict_principles
  where id = p_principle_id and user_id = current_user_id;
  if not found then raise exception 'Principle not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || source_principle.plan_id, 0));

  if coalesce(p_standalone, false) then
    update public.conflict_principles set group_id = null
    where id = p_principle_id and user_id = current_user_id;
  else
    if p_target_principle_id is null or p_target_principle_id = p_principle_id then
      raise exception 'Choose a different principle group';
    end if;
    select * into target_principle
    from public.conflict_principles
    where id = p_target_principle_id
      and user_id = current_user_id
      and plan_id = source_principle.plan_id;
    if not found then raise exception 'The destination principle was not found'; end if;

    destination_group := coalesce(target_principle.group_id, gen_random_uuid());
    if target_principle.group_id is null then
      update public.conflict_principles set group_id = destination_group
      where id = target_principle.id and user_id = current_user_id;
    end if;
    update public.conflict_principles set group_id = destination_group
    where id = source_principle.id and user_id = current_user_id;
  end if;

  return query
    select * from public.conflict_principles
    where user_id = current_user_id and plan_id = source_principle.plan_id
    order by principle_number;
end;
$function$;

revoke all on function public."move_conflict_principle"(p_principle_id uuid, p_target_principle_id uuid, p_standalone boolean) from public, anon, authenticated;

grant execute on function public."move_conflict_principle"(p_principle_id uuid, p_target_principle_id uuid, p_standalone boolean) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.move_conflict_principles(p_principle_ids uuid[], p_target_principle_id uuid DEFAULT NULL::uuid, p_mode text DEFAULT 'standalone'::text, p_group_title text DEFAULT NULL::text)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_ids uuid[];
  source_plan text;
  source_count integer;
  target_principle public.conflict_principles;
  destination_group uuid;
  destination_title text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_mode not in ('standalone', 'existing', 'new') then raise exception 'Unknown move choice'; end if;

  select array_agg(distinct id) into cleaned_ids from unnest(coalesce(p_principle_ids, '{}')) as selected(id);
  if coalesce(cardinality(cleaned_ids), 0) = 0 then raise exception 'Choose at least one principle'; end if;

  select min(plan_id), count(*) into source_plan, source_count
  from public.conflict_principles
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  if source_count <> cardinality(cleaned_ids) then raise exception 'One or more principles could not be moved'; end if;
  if (select count(distinct plan_id) from public.conflict_principles where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null) <> 1 then
    raise exception 'Selected principles must be from one reading plan';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || source_plan, 0));

  if p_mode = 'standalone' then
    update public.conflict_principles
    set group_id = null, group_title = null
    where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  elsif p_mode = 'new' then
    destination_group := gen_random_uuid();
    destination_title := nullif(trim(coalesce(p_group_title, '')), '');
    update public.conflict_principles
    set group_id = destination_group, group_title = destination_title
    where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  else
    if p_target_principle_id is null or p_target_principle_id = any(cleaned_ids) then
      raise exception 'Choose a different principle group';
    end if;
    select * into target_principle
    from public.conflict_principles
    where id = p_target_principle_id
      and user_id = current_user_id
      and plan_id = source_plan
      and deleted_at is null;
    if not found then raise exception 'The destination principle was not found'; end if;

    destination_group := coalesce(target_principle.group_id, gen_random_uuid());
    destination_title := target_principle.group_title;
    if target_principle.group_id is null then
      update public.conflict_principles
      set group_id = destination_group, group_title = destination_title
      where id = target_principle.id and user_id = current_user_id;
    end if;
    update public.conflict_principles
    set group_id = destination_group, group_title = destination_title
    where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  end if;

  return query
    select * from public.conflict_principles
    where user_id = current_user_id and plan_id = source_plan and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."move_conflict_principles"(p_principle_ids uuid[], p_target_principle_id uuid, p_mode text, p_group_title text) from public, anon, authenticated;

grant execute on function public."move_conflict_principles"(p_principle_ids uuid[], p_target_principle_id uuid, p_mode text, p_group_title text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rename_conflict_principle_group(p_group_id uuid, p_title text DEFAULT NULL::text)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  group_plan text;
  clean_title text := nullif(trim(coalesce(p_title, '')), '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(coalesce(clean_title, '')) > 80 then raise exception 'A group name can be up to 80 characters'; end if;
  select plan_id into group_plan from public.conflict_principles
  where group_id = p_group_id and user_id = current_user_id limit 1;
  if not found then raise exception 'Group not found'; end if;
  update public.conflict_principles set group_title = clean_title
  where group_id = p_group_id and user_id = current_user_id and plan_id = group_plan;
  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = group_plan and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."rename_conflict_principle_group"(p_group_id uuid, p_title text) from public, anon, authenticated;

grant execute on function public."rename_conflict_principle_group"(p_group_id uuid, p_title text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dissolve_conflict_principle_group(p_group_id uuid)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  group_plan text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select plan_id into group_plan from public.conflict_principles
  where group_id = p_group_id and user_id = current_user_id limit 1;
  if not found then raise exception 'Group not found'; end if;
  update public.conflict_principles set group_id = null, group_title = null
  where group_id = p_group_id and user_id = current_user_id and plan_id = group_plan;
  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = group_plan and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."dissolve_conflict_principle_group"(p_group_id uuid) from public, anon, authenticated;

grant execute on function public."dissolve_conflict_principle_group"(p_group_id uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_conflict_principles(p_principle_ids uuid[])
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_ids uuid[];
  source_plan text;
  source_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select array_agg(distinct id) into cleaned_ids from unnest(coalesce(p_principle_ids, '{}')) as selected(id);
  if coalesce(cardinality(cleaned_ids), 0) = 0 then raise exception 'Choose at least one principle'; end if;
  select min(plan_id), count(*) into source_plan, source_count from public.conflict_principles
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  if source_count <> cardinality(cleaned_ids) then raise exception 'One or more principles could not be deleted'; end if;
  if (select count(distinct plan_id) from public.conflict_principles where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null) <> 1 then
    raise exception 'Selected principles must be from one reading plan';
  end if;
  update public.conflict_principles set deleted_at = now()
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is null;
  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = source_plan and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."soft_delete_conflict_principles"(p_principle_ids uuid[]) from public, anon, authenticated;

grant execute on function public."soft_delete_conflict_principles"(p_principle_ids uuid[]) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restore_conflict_principles(p_principle_ids uuid[])
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_ids uuid[];
  source_plan text;
  source_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select array_agg(distinct id) into cleaned_ids from unnest(coalesce(p_principle_ids, '{}')) as selected(id);
  if coalesce(cardinality(cleaned_ids), 0) = 0 then raise exception 'Choose at least one principle'; end if;
  select min(plan_id), count(*) into source_plan, source_count from public.conflict_principles
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is not null;
  if source_count <> cardinality(cleaned_ids) then raise exception 'One or more principles could not be restored'; end if;
  if (select count(distinct plan_id) from public.conflict_principles where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is not null) <> 1 then
    raise exception 'Selected principles must be from one reading plan';
  end if;
  update public.conflict_principles set deleted_at = null
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is not null;
  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = source_plan and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."restore_conflict_principles"(p_principle_ids uuid[]) from public, anon, authenticated;

grant execute on function public."restore_conflict_principles"(p_principle_ids uuid[]) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_principle_map_layout(p_plan_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce((
    select layout
    from public.conflict_principle_map_layouts
    where user_id = auth.uid() and plan_id = trim(p_plan_id)
  ), '{}'::jsonb);
$function$;

revoke all on function public."get_principle_map_layout"(p_plan_id text) from public, anon, authenticated;

grant execute on function public."get_principle_map_layout"(p_plan_id text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.hard_delete_conflict_principles(p_principle_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_ids uuid[];
  source_plan text;
  removed_numbers integer[];
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select array_agg(distinct id) into cleaned_ids from unnest(coalesce(p_principle_ids, '{}')) as selected(id);
  if coalesce(cardinality(cleaned_ids), 0) = 0 then raise exception 'Choose at least one principle'; end if;
  select min(plan_id), array_agg(principle_number) into source_plan, removed_numbers
  from public.conflict_principles
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is not null;
  if coalesce(cardinality(removed_numbers), 0) <> cardinality(cleaned_ids) then
    raise exception 'Only Recently Deleted principles can be deleted forever';
  end if;
  delete from public.conflict_principles
  where id = any(cleaned_ids) and user_id = current_user_id and deleted_at is not null;
  update public.conflict_principles principle
  set cross_reference_numbers = array(
    select ref.number from unnest(principle.cross_reference_numbers) as ref(number)
    where not (ref.number = any(removed_numbers)) order by ref.number
  )
  where principle.user_id = current_user_id and principle.plan_id = source_plan
    and principle.cross_reference_numbers && removed_numbers;
end;
$function$;

revoke all on function public."hard_delete_conflict_principles"(p_principle_ids uuid[]) from public, anon, authenticated;

grant execute on function public."hard_delete_conflict_principles"(p_principle_ids uuid[]) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bulk_update_conflict_principles(p_plan_id text, p_updates jsonb)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  temporary_offset integer;
  expected_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_plan_id not in ('bible-conflict-ages-v1', 'chronological-bible-order-v3') then raise exception 'Unknown reading plan'; end if;
  if jsonb_typeof(p_updates) <> 'array' then raise exception 'Spreadsheet updates must be a list'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_plan_id, 0));

  select count(*) into expected_count from public.conflict_principles
  where user_id = current_user_id and plan_id = p_plan_id and deleted_at is null;
  if jsonb_array_length(p_updates) <> expected_count then raise exception 'The spreadsheet must contain every active saved principle exactly once'; end if;
  if exists (
    with updates as (select (item ->> 'id')::uuid as id from jsonb_array_elements(p_updates) as item)
    select id from updates group by id having count(*) > 1
  ) then raise exception 'The spreadsheet contains a duplicated principle row'; end if;
  if exists (
    with updates as (select (item ->> 'id')::uuid as id from jsonb_array_elements(p_updates) as item)
    select 1 from updates left join public.conflict_principles principle
      on principle.id = updates.id and principle.user_id = current_user_id and principle.plan_id = p_plan_id and principle.deleted_at is null
    where principle.id is null
  ) then raise exception 'The spreadsheet contains a principle from another account, reading plan, or Recently Deleted'; end if;
  if exists (
    with updates as (select (item ->> 'principle_number')::integer as new_number, trim(item ->> 'body') as body from jsonb_array_elements(p_updates) as item)
    select 1 from updates where new_number < 1 or char_length(body) < 1 or char_length(body) > 2000
  ) then raise exception 'Every row needs a positive whole number and a principle of 1 to 2000 characters'; end if;
  if exists (
    with updates as (select (item ->> 'principle_number')::integer as new_number from jsonb_array_elements(p_updates) as item)
    select new_number from updates group by new_number having count(*) > 1
  ) then raise exception 'Every principle number must be unique'; end if;
  if exists (
    with updates as (select (item ->> 'principle_number')::integer as new_number from jsonb_array_elements(p_updates) as item)
    select 1 from updates join public.conflict_principles deleted
      on deleted.user_id = current_user_id and deleted.plan_id = p_plan_id and deleted.deleted_at is not null and deleted.principle_number = updates.new_number
  ) then raise exception 'A spreadsheet number is reserved by a principle in Recently Deleted'; end if;

  update public.conflict_principles principle
  set cross_reference_numbers = array(
    select distinct coalesce(number_changes.new_number, ref.number)
    from unnest(principle.cross_reference_numbers) as ref(number)
    left join (
      select saved.principle_number as old_number, (item ->> 'principle_number')::integer as new_number
      from jsonb_array_elements(p_updates) as item
      join public.conflict_principles saved on saved.id = (item ->> 'id')::uuid
      where saved.user_id = current_user_id and saved.plan_id = p_plan_id and saved.deleted_at is null
    ) as number_changes on number_changes.old_number = ref.number order by 1
  )
  where principle.user_id = current_user_id and principle.plan_id = p_plan_id;

  select coalesce(max(principle_number), 0)
       + coalesce((select max((item ->> 'principle_number')::integer) from jsonb_array_elements(p_updates) as item), 0) + 1000
    into temporary_offset from public.conflict_principles
    where user_id = current_user_id and plan_id = p_plan_id;

  update public.conflict_principles principle
  set principle_number = principle.principle_number + temporary_offset
  from jsonb_array_elements(p_updates) as item
  where principle.id = (item ->> 'id')::uuid and principle.user_id = current_user_id
    and principle.plan_id = p_plan_id and principle.deleted_at is null;

  update public.conflict_principles principle
  set principle_number = (item ->> 'principle_number')::integer, body = trim(item ->> 'body')
  from jsonb_array_elements(p_updates) as item
  where principle.id = (item ->> 'id')::uuid and principle.user_id = current_user_id
    and principle.plan_id = p_plan_id and principle.deleted_at is null;

  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = p_plan_id and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."bulk_update_conflict_principles"(p_plan_id text, p_updates jsonb) from public, anon, authenticated;

grant execute on function public."bulk_update_conflict_principles"(p_plan_id text, p_updates jsonb) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_journey_profile()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in to join the Journey leaderboard';
  end if;

  return private.journey_ensure_profile_for_user(current_user_id);
end;
$function$;

revoke all on function public."ensure_journey_profile"() from public, anon, authenticated;

grant execute on function public."ensure_journey_profile"() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reroll_journey_alias()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  last_changed timestamptz;
  candidate_alias text;
  attempt integer := 0;
begin
  if current_user_id is null then
    raise exception 'Sign in to change your Journey alias';
  end if;

  perform private.journey_ensure_profile_for_user(current_user_id);

  select profile.alias_changed_at
    into last_changed
    from public.journey_reward_profiles as profile
   where profile.user_id = current_user_id;

  if last_changed is not null and last_changed > pg_catalog.clock_timestamp() - interval '10 seconds' then
    raise exception 'Please wait a few seconds before choosing another alias';
  end if;

  loop
    candidate_alias := private.journey_alias_from_seed(
      current_user_id::text || ':' || pg_catalog.clock_timestamp()::text || ':'
      || pg_catalog.random()::text || ':' || attempt::text
    );
    begin
      update public.journey_reward_profiles
         set alias = candidate_alias,
             updated_at = pg_catalog.clock_timestamp(),
             alias_changed_at = pg_catalog.clock_timestamp()
       where user_id = current_user_id;
      return candidate_alias;
    exception
      when unique_violation then
        attempt := attempt + 1;
        if attempt >= 30 then
          raise exception 'Could not create a unique Journey alias';
        end if;
    end;
  end loop;
end;
$function$;

revoke all on function public."reroll_journey_alias"() from public, anon, authenticated;

grant execute on function public."reroll_journey_alias"() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_conflict_principle_name(p_principle_id uuid, p_name text)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  saved public.conflict_principles;
  clean_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(clean_name) > 120 then raise exception 'A principle name can be up to 120 characters'; end if;

  update public.conflict_principles
  set principle_name = clean_name
  where id = p_principle_id and user_id = current_user_id and deleted_at is null
  returning * into saved;
  if not found then raise exception 'Principle not found'; end if;

  return query select * from public.conflict_principles
    where user_id = current_user_id and plan_id = saved.plan_id and deleted_at is null
    order by principle_number;
end;
$function$;

revoke all on function public."set_conflict_principle_name"(p_principle_id uuid, p_name text) from public, anon, authenticated;

grant execute on function public."set_conflict_principle_name"(p_principle_id uuid, p_name text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_principle_map_layout(p_plan_id text, p_layout jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  clean_plan_id text := trim(coalesce(p_plan_id, ''));
  clean_layout jsonb := coalesce(p_layout, '{}'::jsonb);
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(clean_plan_id) not between 1 and 120 then raise exception 'Invalid reading plan'; end if;
  if jsonb_typeof(clean_layout) <> 'object' then raise exception 'Invalid Principles Map layout'; end if;
  if octet_length(clean_layout::text) > 2000000 then raise exception 'Principles Map layout is too large'; end if;

  insert into public.conflict_principle_map_layouts (user_id, plan_id, layout, updated_at)
  values (current_user_id, clean_plan_id, clean_layout, now())
  on conflict (user_id, plan_id) do update
    set layout = excluded.layout, updated_at = excluded.updated_at;

  return clean_layout;
end;
$function$;

revoke all on function public."save_principle_map_layout"(p_plan_id text, p_layout jsonb) from public, anon, authenticated;

grant execute on function public."save_principle_map_layout"(p_plan_id text, p_layout jsonb) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_conflict_principle(p_plan_id text, p_reading_id text, p_body text, p_cross_reference_numbers integer[] DEFAULT '{}'::integer[], p_principle_number integer DEFAULT NULL::integer, p_client_mutation_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF conflict_principles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  chosen_number integer;
  created public.conflict_principles;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_plan_id = 'bible-conflict-ages-v1' then
    if p_reading_id !~ '^coa-[0-9]{3}$' then raise exception 'Unknown reading'; end if;
  elsif p_plan_id = 'chronological-bible-order-v3' then
    if p_reading_id !~ '^chron-[0-9]{3}-[0-9]{2}$' then raise exception 'Unknown reading'; end if;
  else
    raise exception 'Unknown reading plan';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 2000 then
    raise exception 'Principle must be between 1 and 2000 characters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_plan_id, 0));

  if p_client_mutation_id is not null then
    select * into created
    from public.conflict_principles
    where user_id = current_user_id
      and plan_id = p_plan_id
      and client_mutation_id = p_client_mutation_id;
    if found then
      if created.reading_id is distinct from p_reading_id
        or created.body is distinct from trim(p_body)
        or created.cross_reference_numbers is distinct from array(
          select distinct ref.number
          from unnest(coalesce(p_cross_reference_numbers, '{}')) as ref(number)
          order by ref.number
        )
        or (p_principle_number is not null and created.principle_number is distinct from p_principle_number)
      then
        raise exception 'Client mutation ID was already used for a different principle';
      end if;
      return next created;
      return;
    end if;
  end if;

  select coalesce(p_principle_number, coalesce(max(principle_number), 0) + 1)
    into chosen_number
  from public.conflict_principles
  where user_id = current_user_id and plan_id = p_plan_id;

  if chosen_number is null or chosen_number < 1 then
    raise exception 'Principle number must be a whole number greater than zero';
  end if;
  if exists (
    select 1 from public.conflict_principles
    where user_id = current_user_id and plan_id = p_plan_id and principle_number = chosen_number
  ) then
    raise exception 'Principle #% is already in use', chosen_number;
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_cross_reference_numbers, '{}')) as requested(number)
    where requested.number <= 0
      or not exists (
        select 1 from public.conflict_principles existing
        where existing.user_id = current_user_id
          and existing.plan_id = p_plan_id
          and existing.principle_number = requested.number
      )
  ) then
    raise exception 'Every cross-reference must identify one of your existing principles';
  end if;

  insert into public.conflict_principles (
    user_id, plan_id, reading_id, principle_number, body, cross_reference_numbers, client_mutation_id
  ) values (
    current_user_id,
    p_plan_id,
    p_reading_id,
    chosen_number,
    trim(p_body),
    array(select distinct ref.number from unnest(coalesce(p_cross_reference_numbers, '{}')) as ref(number) order by ref.number),
    p_client_mutation_id
  ) returning * into created;

  return next created;
end;
$function$;

revoke all on function public."create_conflict_principle"(p_plan_id text, p_reading_id text, p_body text, p_cross_reference_numbers integer[], p_principle_number integer, p_client_mutation_id uuid) from public, anon, authenticated;

grant execute on function public."create_conflict_principle"(p_plan_id text, p_reading_id text, p_body text, p_cross_reference_numbers integer[], p_principle_number integer, p_client_mutation_id uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION private.preserve_bible_highlight_tombstone()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if old.deleted_at is not null then
    return old;
  end if;
  if new.deleted_at is not null then
    return new;
  end if;
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private."preserve_bible_highlight_tombstone"() from public, anon, authenticated;

grant execute on function private."preserve_bible_highlight_tombstone"() to service_role;

CREATE OR REPLACE FUNCTION private.journey_first_name_from_metadata(p_metadata jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  candidate text;
  full_value text;
begin
  candidate := nullif(pg_catalog.btrim(p_metadata ->> 'given_name'), '');

  if candidate is null then
    full_value := coalesce(
      nullif(pg_catalog.btrim(p_metadata ->> 'full_name'), ''),
      nullif(pg_catalog.btrim(p_metadata ->> 'name'), '')
    );

    if full_value is not null then
      candidate := pg_catalog.regexp_replace(full_value, '[[:space:]].*$', '');
    end if;
  end if;

  if candidate is null
     or pg_catalog.char_length(candidate) > 40
     or candidate ~ '[[:cntrl:]<>]' then
    return 'Friend';
  end if;

  return candidate;
end;
$function$;

revoke all on function private."journey_first_name_from_metadata"(p_metadata jsonb) from public, anon, authenticated;

grant execute on function private."journey_first_name_from_metadata"(p_metadata jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.get_my_journey_first_name()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  saved_first_name text;
begin
  if current_user_id is null then
    raise exception 'Sign in to view your Journey name';
  end if;

  perform private.journey_ensure_profile_for_user(current_user_id);

  select profile.first_name
  into saved_first_name
  from public.journey_reward_profiles as profile
  where profile.user_id = current_user_id;

  return coalesce(saved_first_name, 'Friend');
end;
$function$;

revoke all on function public."get_my_journey_first_name"() from public, anon, authenticated;

grant execute on function public."get_my_journey_first_name"() to authenticated, service_role;

CREATE OR REPLACE FUNCTION private.journey_alias_from_seed(p_seed text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  seed_bytes bytea := pg_catalog.decode(pg_catalog.md5(coalesce(p_seed, '')), 'hex');
  adjectives constant text[] := array[
    'Bright', 'Calm', 'Caring', 'Cheerful', 'Courageous', 'Curious',
    'Gentle', 'Grateful', 'Hopeful', 'Joyful', 'Kind', 'Patient',
    'Peaceful', 'Radiant', 'Steady', 'Thoughtful'
  ];
  nouns constant text[] := array[
    'Cedar', 'Dove', 'Garden', 'Harbor', 'Lamp', 'Meadow', 'Morning', 'Olive',
    'Path', 'River', 'Sparrow', 'Star', 'Vine', 'Willow', 'Wren', 'Brook'
  ];
  adjective_index integer;
  noun_index integer;
  suffix_number bigint;
begin
  adjective_index := (pg_catalog.get_byte(seed_bytes, 0) % pg_catalog.array_length(adjectives, 1)) + 1;
  noun_index := (pg_catalog.get_byte(seed_bytes, 1) % pg_catalog.array_length(nouns, 1)) + 1;
  suffix_number := (
    pg_catalog.get_byte(seed_bytes, 2)::bigint * 16777216
    + pg_catalog.get_byte(seed_bytes, 3)::bigint * 65536
    + pg_catalog.get_byte(seed_bytes, 4)::bigint * 256
    + pg_catalog.get_byte(seed_bytes, 5)::bigint
  ) % 1000000;

  return adjectives[adjective_index] || ' ' || nouns[noun_index] || ' '
    || pg_catalog.lpad(suffix_number::text, 6, '0');
end;
$function$;

revoke all on function private."journey_alias_from_seed"(p_seed text) from public, anon, authenticated;

grant execute on function private."journey_alias_from_seed"(p_seed text) to service_role;

CREATE OR REPLACE FUNCTION private.journey_ensure_profile_for_user(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  existing_alias text;
  candidate_alias text;
  attempt integer := 0;
begin
  select profile.alias
    into existing_alias
    from public.journey_reward_profiles as profile
   where profile.user_id = p_user_id;

  if existing_alias is not null then
    return existing_alias;
  end if;

  loop
    candidate_alias := private.journey_alias_from_seed(p_user_id::text || ':' || attempt::text);
    begin
      insert into public.journey_reward_profiles (user_id, alias)
      values (p_user_id, candidate_alias);
      return candidate_alias;
    exception
      when unique_violation then
        select profile.alias
          into existing_alias
          from public.journey_reward_profiles as profile
         where profile.user_id = p_user_id;
        if existing_alias is not null then
          return existing_alias;
        end if;
        attempt := attempt + 1;
        if attempt >= 30 then
          raise exception 'Could not create a unique Journey alias';
        end if;
    end;
  end loop;
end;
$function$;

revoke all on function private."journey_ensure_profile_for_user"(p_user_id uuid) from public, anon, authenticated;

grant execute on function private."journey_ensure_profile_for_user"(p_user_id uuid) to service_role;

CREATE OR REPLACE FUNCTION private.journey_create_profile_after_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.journey_ensure_profile_for_user(new.id);

  update public.journey_reward_profiles
  set first_name = private.journey_first_name_from_metadata(new.raw_user_meta_data),
      updated_at = pg_catalog.clock_timestamp()
  where user_id = new.id;

  return new;
end;
$function$;

revoke all on function private."journey_create_profile_after_signup"() from public, anon, authenticated;

grant execute on function private."journey_create_profile_after_signup"() to service_role;

CREATE OR REPLACE FUNCTION public.update_my_journey_first_name(p_first_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_first_name text;
begin
  if current_user_id is null then
    raise exception 'Sign in to change your Journey name';
  end if;

  if p_first_name is null or p_first_name ~ '[[:cntrl:]<>]' then
    raise exception 'Enter a valid first name'
      using errcode = '22023';
  end if;

  cleaned_first_name := pg_catalog.btrim(p_first_name);

  if pg_catalog.char_length(cleaned_first_name) < 1
     or pg_catalog.char_length(cleaned_first_name) > 40 then
    raise exception 'First name must be between 1 and 40 characters'
      using errcode = '22023';
  end if;

  perform private.journey_ensure_profile_for_user(current_user_id);

  update public.journey_reward_profiles
  set first_name = cleaned_first_name,
      updated_at = pg_catalog.clock_timestamp()
  where user_id = current_user_id;

  return cleaned_first_name;
end;
$function$;

revoke all on function public."update_my_journey_first_name"(p_first_name text) from public, anon, authenticated;

grant execute on function public."update_my_journey_first_name"(p_first_name text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION private.journey_alias_is_safe(p_alias text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  cleaned_alias text;
  canonical_alias text;
  word_form text;
  squeezed_word_form text;
  compact_form text;
  digits_only text;
begin
  if p_alias is null or p_alias ~ '[[:cntrl:]<>]' then
    return false;
  end if;

  cleaned_alias := pg_catalog.regexp_replace(
    pg_catalog.btrim(p_alias),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if pg_catalog.char_length(cleaned_alias) < 3
     or pg_catalog.char_length(cleaned_alias) > 40 then
    return false;
  end if;

  -- Public aliases should not double as contact-information or link sharing.
  if cleaned_alias ~* 'https?://|www[.]|[[:alnum:]-]+[.](com|net|org|edu|gov|io|co)([^[:alnum:]]|$)'
     or pg_catalog.strpos(cleaned_alias, '@') > 0 then
    return false;
  end if;

  digits_only := pg_catalog.regexp_replace(cleaned_alias, '[^0-9]+', '', 'g');
  if pg_catalog.char_length(digits_only) >= 7 then
    return false;
  end if;

  canonical_alias := pg_catalog.lower(
    pg_catalog.translate(cleaned_alias, '013457', 'oieast')
  );
  word_form := ' ' || pg_catalog.regexp_replace(
    canonical_alias,
    '[^[:alnum:]]+',
    ' ',
    'g'
  ) || ' ';
  squeezed_word_form := pg_catalog.regexp_replace(
    word_form,
    '([[:alnum:]])\1+',
    '\1',
    'g'
  );
  compact_form := pg_catalog.regexp_replace(
    canonical_alias,
    '[^[:alnum:]]+',
    '',
    'g'
  );

  if word_form ~ ' (asshole|bitch|cunt|faggot|fuck|kkk|nazi|nigga|nigger|porn|pussy|rape|shit|slut|whore|heil hitler|kill yourself|white power) '
     or squeezed_word_form ~ ' (asshole|bitch|cunt|faggot|fuck|kkk|nazi|nigga|nigger|porn|pussy|rape|shit|slut|whore|heil hitler|kill yourself|white power) '
     or compact_form ~ '^(fuck|nigger|nigga|faggot|porn)(you|off)?[0-9]{0,3}$'
     or canonical_alias ~ '(^|[^[:alnum:]])f[^[:alnum:]]*u[^[:alnum:]]*c[^[:alnum:]]*k([^[:alnum:]]|$)' then
    return false;
  end if;

  return true;
end;
$function$;

revoke all on function private."journey_alias_is_safe"(p_alias text) from public, anon, authenticated;

grant execute on function private."journey_alias_is_safe"(p_alias text) to service_role;

CREATE OR REPLACE FUNCTION public.update_journey_alias(p_alias text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  cleaned_alias text;
begin
  if current_user_id is null then
    raise exception 'Sign in to change your leaderboard name';
  end if;

  cleaned_alias := pg_catalog.regexp_replace(
    pg_catalog.btrim(p_alias),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if not private.journey_alias_is_safe(cleaned_alias) then
    raise exception 'Choose a respectful name from 3 to 40 characters without contact information or links'
      using errcode = '22023';
  end if;

  perform private.journey_ensure_profile_for_user(current_user_id);

  begin
    update public.journey_reward_profiles
    set alias = cleaned_alias,
        updated_at = pg_catalog.clock_timestamp(),
        alias_changed_at = pg_catalog.clock_timestamp()
    where user_id = current_user_id;
  exception
    when unique_violation then
      raise exception 'That leaderboard name is already in use. Please choose another.'
        using errcode = '23505';
  end;

  return cleaned_alias;
end;
$function$;

revoke all on function public."update_journey_alias"(p_alias text) from public, anon, authenticated;

grant execute on function public."update_journey_alias"(p_alias text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_journey_leaderboard_user(p_alias text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to hide a leaderboard reader';
  end if;

  select profile.user_id
  into target_user_id
  from public.journey_reward_profiles as profile
  where pg_catalog.lower(profile.alias) = pg_catalog.lower(pg_catalog.btrim(p_alias));

  if target_user_id is null then
    raise exception 'That leaderboard name is no longer available. Refresh and try again.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot hide your own leaderboard entry';
  end if;

  insert into public.journey_leaderboard_blocks (blocker_user_id, blocked_user_id)
  values (current_user_id, target_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  return true;
end;
$function$;

revoke all on function public."block_journey_leaderboard_user"(p_alias text) from public, anon, authenticated;

grant execute on function public."block_journey_leaderboard_user"(p_alias text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.report_journey_leaderboard_user(p_alias text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
  target_alias text;
  cleaned_reason text := pg_catalog.lower(pg_catalog.btrim(p_reason));
  recent_report_count integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to report a leaderboard name';
  end if;

  if cleaned_reason is null
     or cleaned_reason not in ('offensive_name', 'impersonation', 'spam', 'other') then
    raise exception 'Choose a valid report reason' using errcode = '22023';
  end if;

  select profile.user_id, profile.alias
  into target_user_id, target_alias
  from public.journey_reward_profiles as profile
  where pg_catalog.lower(profile.alias) = pg_catalog.lower(pg_catalog.btrim(p_alias));

  if target_user_id is null then
    raise exception 'That leaderboard name is no longer available. Refresh and try again.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot report your own leaderboard entry';
  end if;

  select pg_catalog.count(*)::integer
  into recent_report_count
  from public.journey_leaderboard_reports as report
  where report.reporter_user_id = current_user_id
    and report.created_at > pg_catalog.clock_timestamp() - interval '1 hour';

  if recent_report_count >= 20 then
    raise exception 'You have sent several recent reports. Please contact support for more help.';
  end if;

  insert into public.journey_leaderboard_reports (
    reporter_user_id,
    reported_user_id,
    reported_alias,
    reason
  )
  values (current_user_id, target_user_id, target_alias, cleaned_reason)
  on conflict (reporter_user_id, reported_user_id, reported_alias, reason)
  do update set
    status = 'pending',
    created_at = pg_catalog.clock_timestamp(),
    reviewed_at = null,
    moderator_note = null;

  insert into public.journey_leaderboard_blocks (blocker_user_id, blocked_user_id)
  values (current_user_id, target_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  return true;
end;
$function$;

revoke all on function public."report_journey_leaderboard_user"(p_alias text, p_reason text) from public, anon, authenticated;

grant execute on function public."report_journey_leaderboard_user"(p_alias text, p_reason text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_conflict_journey_leaderboard()
 RETURNS TABLE(rank bigint, alias text, journey_points integer, completed_chapters integer, is_current_user boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with player_scores as (
    select
      profile.user_id,
      profile.alias,
      coalesce(score.completed_chapters, 0)::integer as completed_chapters
    from public.journey_reward_profiles as profile
    left join public.reading_plan_progress as progress
      on progress.user_id = profile.user_id
     and progress.plan_id = 'bible-conflict-ages-chapters-v1'
    left join lateral (
      select pg_catalog.count(distinct completed_index)::integer as completed_chapters
      from pg_catalog.unnest(
        coalesce(progress.completed_indices, array[]::integer[])
      ) as completed(completed_index)
      where completed_index between 0 and 1695
    ) as score on true
    where auth.uid() is not null and private.journey_alias_is_safe(profile.alias)
      and (
        profile.user_id = auth.uid()
        or not exists (
          select 1
          from public.journey_leaderboard_blocks as blocked
          where (blocked.blocker_user_id = auth.uid() and blocked.blocked_user_id = profile.user_id)
             or (blocked.blocker_user_id = profile.user_id and blocked.blocked_user_id = auth.uid())
        )
      )
  ), ranked_players as (
    select
      pg_catalog.dense_rank() over (order by player.completed_chapters desc) as player_rank,
      player.user_id,
      player.alias,
      player.completed_chapters
    from player_scores as player
  )
  select
    player.player_rank as "rank",
    player.alias,
    player.completed_chapters * 10 as journey_points,
    player.completed_chapters,
    player.user_id = auth.uid() as is_current_user
  from ranked_players as player
  order by player.player_rank, pg_catalog.lower(player.alias);
$function$;

revoke all on function public."get_conflict_journey_leaderboard"() from public, anon, authenticated;

grant execute on function public."get_conflict_journey_leaderboard"() to authenticated, service_role;

create policy "Users can view their own profile" on public."profiles" as PERMISSIVE for SELECT to authenticated using (((select auth.uid()) = id));

create policy "Users can update their own profile" on public."profiles" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = id));

create policy "Users can read their reading plan" on public."reading_plan_progress" as PERMISSIVE for SELECT to authenticated using (((select auth.uid()) = user_id));

create policy "Users can create their reading plan" on public."reading_plan_progress" as PERMISSIVE for INSERT to authenticated with check (((select auth.uid()) = user_id));

create policy "Users can update their reading plan" on public."reading_plan_progress" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members manage own conflict settings" on public."conflict_journey_settings" as PERMISSIVE for ALL to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members manage own conflict progress" on public."conflict_reading_progress" as PERMISSIVE for ALL to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members read own conflict principles" on public."conflict_principles" as PERMISSIVE for SELECT to authenticated using (((select auth.uid()) = user_id));

create policy "Members update own conflict principles" on public."conflict_principles" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members delete own conflict principles" on public."conflict_principles" as PERMISSIVE for DELETE to authenticated using (((select auth.uid()) = user_id));

create policy "Members read conflict discussion posts" on public."conflict_discussion_posts" as PERMISSIVE for SELECT to authenticated using (true);

create policy "Members create own conflict discussion posts" on public."conflict_discussion_posts" as PERMISSIVE for INSERT to authenticated with check (((select auth.uid()) = user_id));

create policy "Members update own conflict discussion posts" on public."conflict_discussion_posts" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members delete own conflict discussion posts" on public."conflict_discussion_posts" as PERMISSIVE for DELETE to authenticated using (((select auth.uid()) = user_id));

create policy "Members read conflict discussion replies" on public."conflict_discussion_replies" as PERMISSIVE for SELECT to authenticated using (true);

create policy "Members create own conflict discussion replies" on public."conflict_discussion_replies" as PERMISSIVE for INSERT to authenticated with check (((select auth.uid()) = user_id));

create policy "Members update own conflict discussion replies" on public."conflict_discussion_replies" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Members delete own conflict discussion replies" on public."conflict_discussion_replies" as PERMISSIVE for DELETE to authenticated using (((select auth.uid()) = user_id));

create policy "People can read their own principle map layout" on public."conflict_principle_map_layouts" as PERMISSIVE for SELECT to authenticated using (((select auth.uid()) = user_id));

create policy "People can create their own principle map layout" on public."conflict_principle_map_layouts" as PERMISSIVE for INSERT to authenticated with check (((select auth.uid()) = user_id));

create policy "People can update their own principle map layout" on public."conflict_principle_map_layouts" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

create policy "Users can read their own Bible highlights" on public."bible_highlights" as PERMISSIVE for SELECT to authenticated using (((select auth.uid()) = user_id));

create policy "Users can add their own Bible highlights" on public."bible_highlights" as PERMISSIVE for INSERT to authenticated with check (((select auth.uid()) = user_id));

create policy "Users can edit their own Bible highlights" on public."bible_highlights" as PERMISSIVE for UPDATE to authenticated using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

revoke all on public."profiles" from public, anon, authenticated;

grant all on public."profiles" to service_role;

grant SELECT, UPDATE on public."profiles" to authenticated;

revoke all on public."reading_plan_progress" from public, anon, authenticated;

grant all on public."reading_plan_progress" to service_role;

grant SELECT, INSERT, UPDATE on public."reading_plan_progress" to authenticated;

revoke all on public."conflict_journey_settings" from public, anon, authenticated;

grant all on public."conflict_journey_settings" to service_role;

grant SELECT, INSERT, UPDATE, DELETE on public."conflict_journey_settings" to authenticated;

revoke all on public."conflict_reading_progress" from public, anon, authenticated;

grant all on public."conflict_reading_progress" to service_role;

grant SELECT, INSERT, UPDATE, DELETE on public."conflict_reading_progress" to authenticated;

revoke all on public."conflict_principles" from public, anon, authenticated;

grant all on public."conflict_principles" to service_role;

grant SELECT, UPDATE, DELETE on public."conflict_principles" to authenticated;

revoke all on public."conflict_principle_map_layouts" from public, anon, authenticated;

grant all on public."conflict_principle_map_layouts" to service_role;

grant SELECT, INSERT, UPDATE on public."conflict_principle_map_layouts" to authenticated;

revoke all on public."conflict_discussion_posts" from public, anon, authenticated;

grant all on public."conflict_discussion_posts" to service_role;

grant SELECT, INSERT, UPDATE, DELETE on public."conflict_discussion_posts" to authenticated;

revoke all on public."conflict_discussion_replies" from public, anon, authenticated;

grant all on public."conflict_discussion_replies" to service_role;

grant SELECT, INSERT, UPDATE, DELETE on public."conflict_discussion_replies" to authenticated;

revoke all on public."bible_highlights" from public, anon, authenticated;

grant all on public."bible_highlights" to service_role;

grant SELECT, INSERT, UPDATE on public."bible_highlights" to authenticated;

revoke all on public."journey_reward_profiles" from public, anon, authenticated;

grant all on public."journey_reward_profiles" to service_role;

revoke all on public."journey_leaderboard_blocks" from public, anon, authenticated;

grant all on public."journey_leaderboard_blocks" to service_role;

revoke all on public."journey_leaderboard_reports" from public, anon, authenticated;

grant all on public."journey_leaderboard_reports" to service_role;

grant usage, select on all sequences in schema public to service_role;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE TRIGGER conflict_settings_touch BEFORE UPDATE ON public.conflict_journey_settings FOR EACH ROW EXECUTE FUNCTION private.touch_conflict_journey_updated_at();

CREATE TRIGGER conflict_progress_touch BEFORE UPDATE ON public.conflict_reading_progress FOR EACH ROW EXECUTE FUNCTION private.touch_conflict_journey_updated_at();

CREATE TRIGGER conflict_principles_touch BEFORE UPDATE ON public.conflict_principles FOR EACH ROW EXECUTE FUNCTION private.touch_conflict_journey_updated_at();

CREATE TRIGGER conflict_posts_touch BEFORE UPDATE ON public.conflict_discussion_posts FOR EACH ROW EXECUTE FUNCTION private.touch_conflict_journey_updated_at();

CREATE TRIGGER conflict_replies_touch BEFORE UPDATE ON public.conflict_discussion_replies FOR EACH ROW EXECUTE FUNCTION private.touch_conflict_journey_updated_at();

CREATE TRIGGER conflict_posts_identity BEFORE INSERT OR UPDATE ON public.conflict_discussion_posts FOR EACH ROW EXECUTE FUNCTION private.set_conflict_discussion_identity();

CREATE TRIGGER conflict_replies_identity BEFORE INSERT OR UPDATE ON public.conflict_discussion_replies FOR EACH ROW EXECUTE FUNCTION private.set_conflict_discussion_identity();

CREATE TRIGGER preserve_bible_highlight_tombstone BEFORE UPDATE ON public.bible_highlights FOR EACH ROW EXECUTE FUNCTION private.preserve_bible_highlight_tombstone();

CREATE TRIGGER create_journey_reward_profile_after_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.journey_create_profile_after_signup();

set check_function_bodies = on;

notify pgrst, 'reload schema';
