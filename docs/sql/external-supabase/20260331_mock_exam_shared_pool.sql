begin;

create table if not exists public.shared_mock_exams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_session_id uuid references public.mock_exam_sessions(id) on delete cascade,
  mode text not null check (mode in ('quick_practice', 'exam_simulation')),
  topic text not null default 'Computer Networks',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  selected_topics text[] not null default '{}'::text[],
  config jsonb not null default '{}'::jsonb,
  exam_payload jsonb not null default '{}'::jsonb,
  total_questions integer not null default 0 check (total_questions >= 0),
  total_marks integer not null default 0 check (total_marks >= 0),
  pdf_drive_link text,
  pdf_download_link text,
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_shared_mock_exams_source_session
  on public.shared_mock_exams (source_session_id)
  where source_session_id is not null;

create index if not exists idx_shared_mock_exams_active_mode_created
  on public.shared_mock_exams (is_active, mode, created_at desc);

create index if not exists idx_shared_mock_exams_usage_count
  on public.shared_mock_exams (usage_count desc, created_at desc);

alter table public.shared_mock_exams enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'shared_mock_exams' and policyname = 'Authenticated users can view shared mock exams'
  ) then
    create policy "Authenticated users can view shared mock exams"
    on public.shared_mock_exams for select
    using (auth.role() = 'authenticated' and is_active = true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'shared_mock_exams' and policyname = 'Users can insert own shared mock exams'
  ) then
    create policy "Users can insert own shared mock exams"
    on public.shared_mock_exams for insert
    with check (auth.uid() = owner_user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'shared_mock_exams' and policyname = 'Users can update own shared mock exams'
  ) then
    create policy "Users can update own shared mock exams"
    on public.shared_mock_exams for update
    using (auth.uid() = owner_user_id)
    with check (auth.uid() = owner_user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'shared_mock_exams' and policyname = 'Users can delete own shared mock exams'
  ) then
    create policy "Users can delete own shared mock exams"
    on public.shared_mock_exams for delete
    using (auth.uid() = owner_user_id);
  end if;
end
$$;

drop trigger if exists update_shared_mock_exams_updated_at on public.shared_mock_exams;
create trigger update_shared_mock_exams_updated_at
before update on public.shared_mock_exams
for each row
execute function public.update_updated_at_column();

commit;
