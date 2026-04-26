begin;

alter table if exists public.shared_mock_exams
add column if not exists owner_display_name text;

create table if not exists public.user_rank_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level between 1 and 100),
  rank_id text not null default 'novice',
  rank_name text not null default 'Novice',
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_rank_snapshots_level
  on public.user_rank_snapshots (level desc, total_xp desc);

alter table public.user_rank_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_rank_snapshots'
      and policyname = 'Authenticated users can view rank snapshots'
  ) then
    create policy "Authenticated users can view rank snapshots"
    on public.user_rank_snapshots for select
    using (auth.role() = 'authenticated');
  end if;
end
$$;

create or replace function public.refresh_my_rank_snapshot(display_name_input text default null)
returns table (
  user_id uuid,
  display_name text,
  total_xp integer,
  level integer,
  rank_id text,
  rank_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  resolved_display_name text := coalesce(nullif(trim(display_name_input), ''), 'Student');
  lesson_xp integer := 0;
  section_xp integer := 0;
  quick_practice_xp integer := 0;
  exam_simulation_xp integer := 0;
  shared_creation_xp integer := 0;
  shared_usage_xp integer := 0;
  computed_xp integer := 0;
  computed_level integer := 1;
  computed_rank_id text := 'novice';
  computed_rank_name text := 'Novice';
begin
  if target_user_id is null then
    raise exception 'refresh_my_rank_snapshot requires an authenticated user';
  end if;

  if to_regclass('public.user_progress') is not null then
    with chapter_lengths(chapter_id, lesson_count) as (
      values
        (1, 3),
        (2, 4),
        (3, 1),
        (4, 1),
        (5, 3),
        (6, 3),
        (7, 1),
        (8, 1),
        (9, 1),
        (10, 2),
        (11, 1)
    )
    select
      (coalesce(sum(cardinality(coalesce(up.lessons_completed, '{}'::text[]))), 0)::integer * 100),
      (coalesce(
        count(*) filter (
          where cardinality(coalesce(up.lessons_completed, '{}'::text[])) >= cl.lesson_count
        ),
        0
      )::integer * 250)
    into lesson_xp, section_xp
    from chapter_lengths cl
    left join public.user_progress up
      on up.user_id = target_user_id
      and up.chapter_id = cl.chapter_id;
  end if;

  if to_regclass('public.mock_exam_sessions') is not null then
    select least(
      3000,
      coalesce(
        sum(
          100 + least(
            100,
            greatest(
              0,
              floor(
                case
                  when result_summary ? 'percentage'
                    and (result_summary ->> 'percentage') ~ '^-?[0-9]+(\.[0-9]+)?$'
                  then (result_summary ->> 'percentage')::numeric
                  else 0
                end
              )::integer
            )
          )
        ),
        0
      )::integer
    )
    into quick_practice_xp
    from public.mock_exam_sessions
    where user_id = target_user_id
      and mode = 'quick_practice'
      and status in ('submitted', 'graded');

    select least(1000, (count(*)::integer * 100))
    into exam_simulation_xp
    from public.mock_exam_sessions
    where user_id = target_user_id
      and mode = 'exam_simulation'
      and status in ('ready', 'submitted', 'graded');
  end if;

  if to_regclass('public.shared_mock_exams') is not null then
    select
      least(1500, count(*)::integer * 150),
      least(500, coalesce(sum(usage_count), 0)::integer * 25)
    into shared_creation_xp, shared_usage_xp
    from public.shared_mock_exams
    where owner_user_id = target_user_id
      and is_active = true;
  end if;

  computed_xp :=
    lesson_xp
    + section_xp
    + quick_practice_xp
    + exam_simulation_xp
    + shared_creation_xp
    + shared_usage_xp;
  computed_level := least(100, floor(computed_xp::numeric / 100)::integer + 1);

  computed_rank_id := case
    when computed_level between 1 and 10 then 'novice'
    when computed_level between 11 and 20 then 'bronze'
    when computed_level between 21 and 30 then 'silver'
    when computed_level between 31 and 40 then 'gold'
    when computed_level between 41 and 50 then 'platinum'
    when computed_level between 51 and 60 then 'diamond'
    when computed_level between 61 and 70 then 'master'
    when computed_level between 71 and 80 then 'grandmaster'
    when computed_level between 81 and 90 then 'ascendant'
    else 'legend'
  end;

  computed_rank_name := case computed_rank_id
    when 'novice' then 'Novice'
    when 'bronze' then 'Bronze'
    when 'silver' then 'Silver'
    when 'gold' then 'Gold'
    when 'platinum' then 'Platinum'
    when 'diamond' then 'Diamond'
    when 'master' then 'Master'
    when 'grandmaster' then 'Grandmaster'
    when 'ascendant' then 'Ascendant'
    else 'Legend'
  end;

  insert into public.user_rank_snapshots (
    user_id,
    display_name,
    total_xp,
    level,
    rank_id,
    rank_name,
    updated_at
  )
  values (
    target_user_id,
    resolved_display_name,
    computed_xp,
    computed_level,
    computed_rank_id,
    computed_rank_name,
    now()
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    total_xp = excluded.total_xp,
    level = excluded.level,
    rank_id = excluded.rank_id,
    rank_name = excluded.rank_name,
    updated_at = now();

  return query
  select
    snapshot.user_id,
    snapshot.display_name,
    snapshot.total_xp,
    snapshot.level,
    snapshot.rank_id,
    snapshot.rank_name,
    snapshot.updated_at
  from public.user_rank_snapshots snapshot
  where snapshot.user_id = target_user_id;
end;
$$;

create or replace function public.increment_shared_mock_exam_usage(shared_exam_id_input uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_usage_count integer;
begin
  if auth.uid() is null then
    raise exception 'increment_shared_mock_exam_usage requires an authenticated user';
  end if;

  if to_regclass('public.shared_mock_exams') is null then
    raise exception 'shared_mock_exams table is not available';
  end if;

  update public.shared_mock_exams
  set
    usage_count = usage_count + 1,
    updated_at = now()
  where id = shared_exam_id_input
    and is_active = true
  returning usage_count into next_usage_count;

  if next_usage_count is null then
    raise exception 'shared mock exam not found';
  end if;

  return next_usage_count;
end;
$$;

grant select on public.user_rank_snapshots to authenticated;
grant execute on function public.refresh_my_rank_snapshot(text) to authenticated;
grant execute on function public.increment_shared_mock_exam_usage(uuid) to authenticated;

commit;
