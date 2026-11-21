-- Student records are provisioned by administrators. Every portal query runs as the student.
begin;

create domain public.dean_translation as jsonb
  check (value is null or (
    jsonb_typeof(value) = 'object' and value ?& array['ru', 'en']
    and jsonb_typeof(value -> 'ru') = 'string' and jsonb_typeof(value -> 'en') = 'string'
    and length(btrim(value ->> 'ru')) > 0 and length(btrim(value ->> 'en')) > 0
    and value - 'ru' - 'en' = '{}'::jsonb
  ));

create table public.dean_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name public.dean_translation not null,
  faculty public.dean_translation not null,
  program public.dean_translation not null,
  year smallint not null check (year between 1 and 12),
  group_code text not null check (length(btrim(group_code)) > 0)
);

create table public.dean_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dean_profiles on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null check (extract(second from start_time) = 0),
  end_time time not null check (extract(second from end_time) = 0 and end_time > start_time),
  subject public.dean_translation not null,
  teacher public.dean_translation not null,
  room text not null,
  change public.dean_translation
);

create table public.dean_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dean_profiles on delete cascade,
  subject public.dean_translation not null,
  score smallint check (score between 0 and 100),
  credits smallint not null check (credits > 0),
  assessment text not null check (assessment in ('exam', 'credit')),
  exam_date date
);

create table public.dean_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.dean_profiles on delete cascade,
  kind text not null check (kind in ('certificate', 'application')),
  note text not null check (octet_length(note) <= 256),
  status text not null default 'submitted' check (status in ('submitted', 'review', 'ready')),
  created_at timestamptz not null default now()
);

create table public.dean_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dean_profiles on delete cascade,
  title public.dean_translation not null,
  body public.dean_translation not null,
  kind text not null check (kind in ('announcement', 'deadline', 'schedule')),
  date timestamptz not null default now(),
  read boolean not null default false
);

create index on public.dean_lessons (user_id, id);
create index on public.dean_grades (user_id, id);
create index on public.dean_applications (user_id, id);
create index on public.dean_notifications (user_id, id);

alter table public.dean_profiles enable row level security;
alter table public.dean_lessons enable row level security;
alter table public.dean_grades enable row level security;
alter table public.dean_applications enable row level security;
alter table public.dean_notifications enable row level security;

revoke all on public.dean_profiles, public.dean_lessons, public.dean_grades,
  public.dean_applications, public.dean_notifications from public, anon, authenticated;
grant select (user_id, name, faculty, program, year, group_code) on public.dean_profiles to authenticated;
grant select (user_id, id, weekday, start_time, end_time, subject, teacher, room, change) on public.dean_lessons to authenticated;
grant select (user_id, id, subject, score, credits, assessment, exam_date) on public.dean_grades to authenticated;
grant select (user_id, id, kind, note, status, created_at), insert (kind, note) on public.dean_applications to authenticated;
grant select (user_id, id, title, body, kind, date, read), update (read) on public.dean_notifications to authenticated;

-- The offline seed uses a privileged Auth Admin key and writes only fictional fixtures.
grant select, insert on public.dean_profiles, public.dean_lessons, public.dean_grades,
  public.dean_applications, public.dean_notifications to service_role;

create policy dean_profile_self on public.dean_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy dean_lesson_self on public.dean_lessons for select to authenticated using (user_id = (select auth.uid()));
create policy dean_grade_self on public.dean_grades for select to authenticated using (user_id = (select auth.uid()));
create policy dean_application_self on public.dean_applications for select to authenticated using (user_id = (select auth.uid()));
create policy dean_notification_self on public.dean_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy dean_submit_self on public.dean_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'submitted');
create policy dean_read_self on public.dean_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and read);

commit;
