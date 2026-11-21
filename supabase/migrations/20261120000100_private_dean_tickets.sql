begin;

alter table public.dean_applications drop constraint dean_applications_kind_check;
alter table public.dean_applications add constraint dean_applications_kind_check
  check (kind in ('application', 'certificate', 'ticket'));
alter table public.dean_applications add constraint dean_ticket_requires_note
  check (kind <> 'ticket' or note ~ '[^[:space:]]');

-- These immutable IDs belong to the two published fixture credentials.
create function public.dean_is_demo_user(id uuid) returns boolean
language sql immutable strict set search_path = '' as $$
  select id in ('57f01001-0000-4000-8000-000000000001'::uuid,
                '57f01002-0000-4000-8000-000000000001'::uuid)
$$;

-- Provision and revoke by Auth UUID from an administrator's database session.
create table public.dean_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  check (not public.dean_is_demo_user(user_id))
);
alter table public.dean_staff enable row level security;
revoke all on public.dean_staff from public, anon, authenticated;
grant select (user_id) on public.dean_staff to authenticated;
create policy dean_staff_self on public.dean_staff for select to authenticated
  using (user_id = (select auth.uid()));

-- Old Supabase sessions for the public fixtures may read only their seeded samples.
alter policy dean_application_self on public.dean_applications using (
  user_id = (select auth.uid()) and (
    not public.dean_is_demo_user(user_id) or
    (kind <> 'ticket' and id in (
      '57f01001-0003-4000-8000-000000000001', '57f01001-0003-4000-8000-000000000002',
      '57f01002-0003-4000-8000-000000000001', '57f01002-0003-4000-8000-000000000002'
    ))
  )
);
alter policy dean_submit_self on public.dean_applications with check (
  user_id = (select auth.uid()) and not public.dean_is_demo_user(user_id) and status = 'submitted'
);

grant update (status) on public.dean_applications to authenticated;
create policy dean_staff_inbox on public.dean_applications for select to authenticated using (
  kind = 'ticket' and exists (select 1 from public.dean_staff where user_id = (select auth.uid()))
);
create policy dean_staff_status on public.dean_applications for update to authenticated using (
  kind = 'ticket' and exists (select 1 from public.dean_staff where user_id = (select auth.uid()))
) with check (
  kind = 'ticket' and exists (select 1 from public.dean_staff where user_id = (select auth.uid()))
);

commit;
