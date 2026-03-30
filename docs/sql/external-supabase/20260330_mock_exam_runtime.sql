begin;

create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public;

create table if not exists public.mock_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('quick_practice', 'exam_simulation')),
  status text not null default 'generating' check (
    status in ('generating', 'ready', 'in_progress', 'submitted', 'graded', 'abandoned', 'failed')
  ),
  topic text not null default 'Computer Networks',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  selected_topics text[] not null default '{}'::text[],
  config jsonb not null default '{}'::jsonb,
  progress_state jsonb not null default '{}'::jsonb,
  source_summary jsonb not null default '[]'::jsonb,
  exam_payload jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  pdf_drive_link text,
  pdf_download_link text,
  total_questions integer not null default 0 check (total_questions >= 0),
  total_marks integer not null default 0 check (total_marks >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  started_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mock_exam_sessions_user_created_at
  on public.mock_exam_sessions (user_id, created_at desc);

create index if not exists idx_mock_exam_sessions_status
  on public.mock_exam_sessions (status);

create index if not exists idx_mock_exam_sessions_mode
  on public.mock_exam_sessions (mode);

create table if not exists public.mock_exam_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mock_exam_sessions(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  display_order integer not null default 0 check (display_order >= 0),
  question_type text not null check (
    question_type in ('mcq', 'short_answer', 'calculation', 'open_ended', 'diagram_based')
  ),
  topic text,
  subtopic text,
  marks integer not null default 0 check (marks >= 0),
  source_lineage jsonb not null default '{}'::jsonb,
  question_snapshot jsonb not null default '{}'::jsonb,
  answer_key_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, question_number)
);

create index if not exists idx_mock_exam_questions_session_order
  on public.mock_exam_questions (session_id, display_order, question_number);

create index if not exists idx_mock_exam_questions_topic
  on public.mock_exam_questions (topic, subtopic);

create table if not exists public.mock_exam_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mock_exam_sessions(id) on delete cascade,
  question_id uuid not null references public.mock_exam_questions(id) on delete cascade,
  part_label text,
  answer_text text,
  answer_json jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  is_flagged boolean not null default false,
  is_final boolean not null default false,
  grading_status text not null default 'pending' check (
    grading_status in ('pending', 'auto_graded', 'ai_graded', 'reviewed')
  ),
  score_earned numeric(6,2) check (score_earned is null or score_earned >= 0),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mock_exam_answers_session_question
  on public.mock_exam_answers (session_id, question_id);

create index if not exists idx_mock_exam_answers_submitted_at
  on public.mock_exam_answers (submitted_at);

create unique index if not exists uq_mock_exam_answers_part
  on public.mock_exam_answers (session_id, question_id, coalesce(part_label, ''));

create table if not exists public.user_mock_exam_weaknesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  subtopic text,
  question_type text,
  weakness_score numeric(5,2) not null default 0 check (weakness_score >= 0),
  confidence_score numeric(4,3) not null default 0 check (
    confidence_score >= 0 and confidence_score <= 1
  ),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_mock_exam_weaknesses_user_last_seen
  on public.user_mock_exam_weaknesses (user_id, last_seen_at desc);

create unique index if not exists uq_user_mock_exam_weakness_scope
  on public.user_mock_exam_weaknesses (
    user_id,
    topic,
    coalesce(subtopic, ''),
    coalesce(question_type, '')
  );

alter table public.mock_exam_sessions enable row level security;
alter table public.mock_exam_questions enable row level security;
alter table public.mock_exam_answers enable row level security;
alter table public.user_mock_exam_weaknesses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_sessions' and policyname = 'Users can view own mock exam sessions'
  ) then
    create policy "Users can view own mock exam sessions"
    on public.mock_exam_sessions for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_sessions' and policyname = 'Users can insert own mock exam sessions'
  ) then
    create policy "Users can insert own mock exam sessions"
    on public.mock_exam_sessions for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_sessions' and policyname = 'Users can update own mock exam sessions'
  ) then
    create policy "Users can update own mock exam sessions"
    on public.mock_exam_sessions for update
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_sessions' and policyname = 'Users can delete own mock exam sessions'
  ) then
    create policy "Users can delete own mock exam sessions"
    on public.mock_exam_sessions for delete
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_questions' and policyname = 'Users can view own mock exam questions'
  ) then
    create policy "Users can view own mock exam questions"
    on public.mock_exam_questions for select
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_questions' and policyname = 'Users can insert own mock exam questions'
  ) then
    create policy "Users can insert own mock exam questions"
    on public.mock_exam_questions for insert
    with check (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_questions' and policyname = 'Users can update own mock exam questions'
  ) then
    create policy "Users can update own mock exam questions"
    on public.mock_exam_questions for update
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_questions' and policyname = 'Users can delete own mock exam questions'
  ) then
    create policy "Users can delete own mock exam questions"
    on public.mock_exam_questions for delete
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_answers' and policyname = 'Users can view own mock exam answers'
  ) then
    create policy "Users can view own mock exam answers"
    on public.mock_exam_answers for select
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_answers' and policyname = 'Users can insert own mock exam answers'
  ) then
    create policy "Users can insert own mock exam answers"
    on public.mock_exam_answers for insert
    with check (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_answers' and policyname = 'Users can update own mock exam answers'
  ) then
    create policy "Users can update own mock exam answers"
    on public.mock_exam_answers for update
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mock_exam_answers' and policyname = 'Users can delete own mock exam answers'
  ) then
    create policy "Users can delete own mock exam answers"
    on public.mock_exam_answers for delete
    using (
      exists (
        select 1
        from public.mock_exam_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_mock_exam_weaknesses' and policyname = 'Users can view own mock exam weaknesses'
  ) then
    create policy "Users can view own mock exam weaknesses"
    on public.user_mock_exam_weaknesses for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_mock_exam_weaknesses' and policyname = 'Users can insert own mock exam weaknesses'
  ) then
    create policy "Users can insert own mock exam weaknesses"
    on public.user_mock_exam_weaknesses for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_mock_exam_weaknesses' and policyname = 'Users can update own mock exam weaknesses'
  ) then
    create policy "Users can update own mock exam weaknesses"
    on public.user_mock_exam_weaknesses for update
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_mock_exam_weaknesses' and policyname = 'Users can delete own mock exam weaknesses'
  ) then
    create policy "Users can delete own mock exam weaknesses"
    on public.user_mock_exam_weaknesses for delete
    using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists update_mock_exam_sessions_updated_at on public.mock_exam_sessions;
create trigger update_mock_exam_sessions_updated_at
before update on public.mock_exam_sessions
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_mock_exam_answers_updated_at on public.mock_exam_answers;
create trigger update_mock_exam_answers_updated_at
before update on public.mock_exam_answers
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_user_mock_exam_weaknesses_updated_at on public.user_mock_exam_weaknesses;
create trigger update_user_mock_exam_weaknesses_updated_at
before update on public.user_mock_exam_weaknesses
for each row
execute function public.update_updated_at_column();

commit;
