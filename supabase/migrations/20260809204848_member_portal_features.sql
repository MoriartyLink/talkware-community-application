-- Talkware member portal, event registration, resources, posts, and attendance.
-- Existing Auth users are promoted to admins because Auth was admin-only before
-- this migration. New Google OAuth users are not staff.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter table public.events
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists registration_deadline timestamptz,
  add column if not exists capacity integer,
  add column if not exists published boolean not null default true,
  add column if not exists registration_open boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_capacity_positive'
  ) then
    alter table public.events
      add constraint events_capacity_positive check (capacity is null or capacity > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'events_time_order'
  ) then
    alter table public.events
      add constraint events_time_order check (ends_at is null or starts_at is null or ends_at > starts_at);
  end if;
end $$;

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  avatar_url text,
  headline text check (headline is null or char_length(headline) <= 120),
  bio text check (bio is null or char_length(bio) <= 500),
  skills text[] not null default '{}',
  github_url text,
  linkedin_url text,
  public_listing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  role_title text not null check (char_length(trim(role_title)) between 2 and 120),
  interests text not null check (char_length(trim(interests)) between 2 and 500),
  motivation text not null check (char_length(trim(motivation)) between 10 and 1200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'organizer')),
  can_review_members boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.staff_roles (user_id, role, can_review_members)
select id, 'admin', true from auth.users
on conflict (user_id) do nothing;

create table if not exists public.member_passes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  active boolean not null default true,
  issued_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 160),
  body text not null check (char_length(trim(body)) between 2 and 10000),
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table if not exists public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  storage_path text not null unique,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_kind text not null check (registration_kind in ('member', 'guest')),
  member_id uuid references auth.users(id) on delete cascade,
  guest_name text,
  guest_email text,
  guest_phone text,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlisted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (registration_kind = 'member' and member_id is not null and guest_name is null and guest_email is null)
    or
    (registration_kind = 'guest' and member_id is null and char_length(trim(guest_name)) >= 2 and guest_email is not null)
  )
);

create unique index if not exists event_registrations_active_member_uidx
  on public.event_registrations(event_id, member_id)
  where member_id is not null and status <> 'cancelled';
create unique index if not exists event_registrations_active_guest_email_uidx
  on public.event_registrations(event_id, lower(guest_email))
  where guest_email is not null and status <> 'cancelled';
create index if not exists event_registrations_event_status_created_idx
  on public.event_registrations(event_id, status, created_at);

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  scanned_by uuid not null references auth.users(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  unique (event_id, member_id),
  unique (registration_id)
);

create index if not exists events_member_directory_idx
  on public.events(published, archived, starts_at);
create index if not exists member_profiles_public_idx
  on public.member_profiles(public_listing, display_name);
create index if not exists membership_applications_status_idx
  on public.membership_applications(status, submitted_at);
create index if not exists community_posts_published_idx
  on public.community_posts(published, published_at desc);
create index if not exists event_resources_event_sort_idx
  on public.event_resources(event_id, sort_order);
create index if not exists event_attendance_event_checked_idx
  on public.event_attendance(event_id, checked_in_at);

create or replace function private.is_approved_member(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membership_applications
    where user_id = check_user_id and status = 'approved'
  );
$$;

create or replace function private.is_staff(
  allowed_roles text[] default array['admin', 'organizer']::text[],
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = check_user_id and role = any(allowed_roles)
  );
$$;

create or replace function private.can_review_members(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = check_user_id
      and (role = 'admin' or can_review_members)
  );
$$;

revoke all on function private.is_approved_member(uuid) from public;
revoke all on function private.is_staff(text[], uuid) from public;
revoke all on function private.can_review_members(uuid) from public;
grant execute on function private.is_approved_member(uuid) to anon, authenticated;
grant execute on function private.is_staff(text[], uuid) to authenticated;
grant execute on function private.can_review_members(uuid) to authenticated;

create or replace function private.issue_member_pass_after_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.user_id is not null then
    insert into public.member_passes (user_id, active)
    values (new.user_id, true)
    on conflict (user_id) do update set active = true;
  elsif new.status <> 'approved' and new.user_id is not null then
    update public.member_passes set active = false where user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function private.issue_member_pass_after_review() from public;
drop trigger if exists membership_application_reviewed on public.membership_applications;
create trigger membership_application_reviewed
after insert or update of status on public.membership_applications
for each row execute function private.issue_member_pass_after_review();

create or replace function private.assign_registration_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.events%rowtype;
  confirmed_count integer;
begin
  select * into selected_event
  from public.events
  where id = new.event_id
  for update;

  if not found or not selected_event.published or selected_event.archived then
    raise exception 'This event is unavailable for registration';
  end if;
  if not selected_event.registration_open then
    raise exception 'Registration is closed';
  end if;
  if selected_event.registration_deadline is not null and now() > selected_event.registration_deadline then
    raise exception 'The registration deadline has passed';
  end if;

  if new.registration_kind = 'member' then
    if new.member_id is null or not private.is_approved_member(new.member_id) then
      raise exception 'Approved community membership is required';
    end if;
    new.guest_name := null;
    new.guest_email := null;
    new.guest_phone := null;
  else
    new.member_id := null;
    new.guest_name := trim(new.guest_name);
    new.guest_email := lower(trim(new.guest_email));
    new.guest_phone := nullif(trim(new.guest_phone), '');
  end if;

  select count(*) into confirmed_count
  from public.event_registrations
  where event_id = new.event_id and status = 'confirmed';

  new.status := case
    when selected_event.capacity is null or confirmed_count < selected_event.capacity then 'confirmed'
    else 'waitlisted'
  end;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.assign_registration_status() from public;
drop trigger if exists assign_event_registration_status on public.event_registrations;
create trigger assign_event_registration_status
before insert on public.event_registrations
for each row execute function private.assign_registration_status();

create or replace function private.promote_event_waitlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promoted_id uuid;
begin
  new.updated_at := now();
  if old.status = 'confirmed' and new.status = 'cancelled' then
    perform 1 from public.events where id = new.event_id for update;
    select id into promoted_id
    from public.event_registrations
    where event_id = new.event_id and status = 'waitlisted'
    order by created_at asc
    limit 1
    for update skip locked;

    if promoted_id is not null then
      update public.event_registrations
      set status = 'confirmed', updated_at = now()
      where id = promoted_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.promote_event_waitlist() from public;
drop trigger if exists promote_event_waitlist_after_cancel on public.event_registrations;
create trigger promote_event_waitlist_after_cancel
after update of status on public.event_registrations
for each row execute function private.promote_event_waitlist();

create or replace function public.register_for_event(p_event_id uuid)
returns table (registration_id uuid, registration_status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_status text;
begin
  if auth.uid() is null or not private.is_approved_member(auth.uid()) then
    raise exception 'Approved community membership is required';
  end if;

  insert into public.event_registrations (event_id, registration_kind, member_id)
  values (p_event_id, 'member', auth.uid())
  returning id, status into saved_id, saved_status;

  return query select saved_id, saved_status;
exception
  when unique_violation then
    return query
      select id, status
      from public.event_registrations
      where event_id = p_event_id
        and member_id = auth.uid()
        and status <> 'cancelled'
      limit 1;
end;
$$;

create or replace function private.register_guest_for_event(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_phone text default null
)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_status text;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Name is required';
  end if;
  if coalesce(p_email, '') !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'A valid email address is required';
  end if;

  insert into public.event_registrations (
    event_id, registration_kind, guest_name, guest_email, guest_phone
  ) values (
    p_event_id, 'guest', trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), '')
  ) returning id, status into saved_id, saved_status;

  return query select saved_id, saved_status;
exception
  when unique_violation then
    raise exception 'This email is already registered for the event';
end;
$$;

revoke all on function private.register_guest_for_event(uuid, text, text, text) from public;
grant execute on function private.register_guest_for_event(uuid, text, text, text) to anon;

create or replace function public.register_guest_for_event(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_phone text default null
)
returns table (registration_id uuid, registration_status text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.register_guest_for_event(p_event_id, p_name, p_email, p_phone);
$$;

create or replace function public.record_event_attendance(p_event_id uuid, p_member_token uuid)
returns table (
  attendance_id uuid,
  member_name text,
  checked_in_at timestamptz,
  already_checked_in boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pass_user_id uuid;
  registration public.event_registrations%rowtype;
  existing public.event_attendance%rowtype;
  created public.event_attendance%rowtype;
  display_name text;
begin
  if not private.is_staff() then
    raise exception 'Organizer access is required';
  end if;

  select user_id into pass_user_id
  from public.member_passes
  where token = p_member_token and active = true;

  if pass_user_id is null or not private.is_approved_member(pass_user_id) then
    raise exception 'Member pass is invalid or inactive';
  end if;

  select * into registration
  from public.event_registrations
  where event_id = p_event_id
    and member_id = pass_user_id
    and status = 'confirmed'
  limit 1;

  if registration.id is null then
    raise exception 'Member is not confirmed for this event';
  end if;

  select * into existing
  from public.event_attendance
  where event_id = p_event_id and member_id = pass_user_id;

  select p.display_name into display_name
  from public.member_profiles p where p.user_id = pass_user_id;

  if existing.id is not null then
    return query select existing.id, display_name, existing.checked_in_at, true;
    return;
  end if;

  insert into public.event_attendance (event_id, registration_id, member_id, scanned_by)
  values (p_event_id, registration.id, pass_user_id, auth.uid())
  returning * into created;

  return query select created.id, display_name, created.checked_in_at, false;
end;
$$;

revoke all on function public.register_for_event(uuid) from public;
revoke all on function public.register_guest_for_event(uuid, text, text, text) from public;
revoke all on function public.record_event_attendance(uuid, uuid) from public;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.register_guest_for_event(uuid, text, text, text) to anon;
grant execute on function public.record_event_attendance(uuid, uuid) to authenticated;

alter table public.member_profiles enable row level security;
alter table public.membership_applications enable row level security;
alter table public.staff_roles enable row level security;
alter table public.member_passes enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.event_resources enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_attendance enable row level security;

drop policy if exists "Public read events" on public.events;
drop policy if exists "Admin write events" on public.events;
create policy "Anonymous users read published events" on public.events for select to anon
  using (published = true);
create policy "Authenticated event visibility" on public.events for select to authenticated
  using (published = true or private.is_staff());
create policy "Staff insert events" on public.events for insert to authenticated
  with check (private.is_staff());
create policy "Staff update events" on public.events for update to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy "Staff delete events" on public.events for delete to authenticated
  using (private.is_staff());

drop policy if exists "Public read event_media" on public.event_media;
drop policy if exists "Public read event_sections" on public.event_sections;
create policy "Anonymous users read published event media" on public.event_media for select to anon
  using (exists (select 1 from public.events where events.id = event_media.event_id and events.published));
create policy "Authenticated event media visibility" on public.event_media for select to authenticated
  using (exists (select 1 from public.events where events.id = event_media.event_id and (events.published or private.is_staff())));
create policy "Anonymous users read published event sections" on public.event_sections for select to anon
  using (exists (select 1 from public.events where events.id = event_sections.event_id and events.published));
create policy "Authenticated event section visibility" on public.event_sections for select to authenticated
  using (exists (select 1 from public.events where events.id = event_sections.event_id and (events.published or private.is_staff())));

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['highlights','co_creators','volunteers','founding_team','contributor_tags','contributors','event_media','event_sections']
  loop
    policy_name := 'Admin write ' || table_name;
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_staff())', 'Staff insert ' || table_name, table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_staff()) with check (private.is_staff())', 'Staff update ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_staff())', 'Staff delete ' || table_name, table_name);
  end loop;
end $$;

create policy "Public approved profiles" on public.member_profiles for select to anon
  using (public_listing and private.is_approved_member(user_id));
create policy "Authenticated profile visibility" on public.member_profiles for select to authenticated
  using ((public_listing and private.is_approved_member(user_id)) or (select auth.uid()) = user_id or private.is_staff());
create policy "Members create own profile" on public.member_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id or private.is_staff());
create policy "Members update own profile" on public.member_profiles for update to authenticated
  using ((select auth.uid()) = user_id or private.is_staff())
  with check ((select auth.uid()) = user_id or private.is_staff());
create policy "Staff delete profiles" on public.member_profiles for delete to authenticated
  using (private.is_staff());

create policy "Application visibility" on public.membership_applications for select to authenticated
  using ((select auth.uid()) = user_id or private.can_review_members());
create policy "Applicants submit own application" on public.membership_applications for insert to authenticated
  with check (
    status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and (select auth.uid()) = user_id
    and lower(email) = lower(coalesce((select auth.jwt())->>'email', ''))
  );
create policy "Reviewers update applications" on public.membership_applications for update to authenticated
  using (private.can_review_members()) with check (private.can_review_members());

create policy "Staff read own role" on public.staff_roles for select to authenticated
  using ((select auth.uid()) = user_id or private.is_staff(array['admin']::text[]));
create policy "Admins insert staff roles" on public.staff_roles for insert to authenticated
  with check (private.is_staff(array['admin']::text[]));
create policy "Admins update staff roles" on public.staff_roles for update to authenticated
  using (private.is_staff(array['admin']::text[])) with check (private.is_staff(array['admin']::text[]));
create policy "Admins delete staff roles" on public.staff_roles for delete to authenticated
  using (private.is_staff(array['admin']::text[]));

create policy "Member pass visibility" on public.member_passes for select to authenticated
  using (((select auth.uid()) = user_id and private.is_approved_member()) or private.is_staff());
create policy "Admins insert member passes" on public.member_passes for insert to authenticated
  with check (private.is_staff(array['admin']::text[]));
create policy "Admins update member passes" on public.member_passes for update to authenticated
  using (private.is_staff(array['admin']::text[])) with check (private.is_staff(array['admin']::text[]));
create policy "Admins delete member passes" on public.member_passes for delete to authenticated
  using (private.is_staff(array['admin']::text[]));

create policy "Members read published posts" on public.community_posts for select to authenticated
  using ((published and private.is_approved_member()) or private.is_staff());
create policy "Staff insert posts" on public.community_posts for insert to authenticated with check (private.is_staff());
create policy "Staff update posts" on public.community_posts for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff delete posts" on public.community_posts for delete to authenticated using (private.is_staff());

create policy "Members read reactions" on public.post_reactions for select to authenticated
  using (private.is_approved_member() or private.is_staff());
create policy "Members add own reaction" on public.post_reactions for insert to authenticated
  with check (((select auth.uid()) = member_id and private.is_approved_member()) or private.is_staff());
create policy "Members change own reaction" on public.post_reactions for update to authenticated
  using (((select auth.uid()) = member_id and private.is_approved_member()) or private.is_staff())
  with check (((select auth.uid()) = member_id and private.is_approved_member()) or private.is_staff());
create policy "Members remove own reaction" on public.post_reactions for delete to authenticated
  using (((select auth.uid()) = member_id and private.is_approved_member()) or private.is_staff());

create policy "Members read event resources" on public.event_resources for select to authenticated
  using (private.is_approved_member() or private.is_staff());
create policy "Staff insert event resources" on public.event_resources for insert to authenticated with check (private.is_staff());
create policy "Staff update event resources" on public.event_resources for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff delete event resources" on public.event_resources for delete to authenticated using (private.is_staff());

create policy "Members read own registrations" on public.event_registrations for select to authenticated
  using ((select auth.uid()) = member_id or private.is_staff());
create policy "Members register themselves" on public.event_registrations for insert to authenticated
  with check (
    (registration_kind = 'member' and member_id = (select auth.uid()) and private.is_approved_member())
    or private.is_staff()
  );
create policy "Guests register for events" on public.event_registrations for insert to anon
  with check (
    registration_kind = 'guest'
    and member_id is null
    and guest_name is not null
    and guest_email is not null
  );
create policy "Members cancel own registration" on public.event_registrations for update to authenticated
  using (((select auth.uid()) = member_id and private.is_approved_member()) or private.is_staff())
  with check (((select auth.uid()) = member_id and status = 'cancelled' and private.is_approved_member()) or private.is_staff());
create policy "Staff delete registrations" on public.event_registrations for delete to authenticated using (private.is_staff());

create policy "Members read own attendance" on public.event_attendance for select to authenticated
  using ((select auth.uid()) = member_id or private.is_staff());
create policy "Staff insert attendance" on public.event_attendance for insert to authenticated with check (private.is_staff());
create policy "Staff update attendance" on public.event_attendance for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff delete attendance" on public.event_attendance for delete to authenticated using (private.is_staff());

grant select on public.events, public.highlights, public.co_creators, public.volunteers,
  public.founding_team, public.contributor_tags, public.contributors,
  public.event_media, public.event_sections, public.member_profiles to anon, authenticated;
grant select, insert, update, delete on public.events, public.highlights, public.co_creators,
  public.volunteers, public.founding_team, public.contributor_tags, public.contributors,
  public.event_media, public.event_sections to authenticated;
grant select, insert, update on public.member_profiles to authenticated;
grant select, insert, update on public.membership_applications to authenticated;
grant select, insert, update, delete on public.staff_roles, public.member_passes,
  public.community_posts, public.post_reactions, public.event_resources,
  public.event_registrations, public.event_attendance to authenticated;
revoke update on public.event_registrations from authenticated;
grant update (status, updated_at) on public.event_registrations to authenticated;
revoke all on public.event_registrations from anon;

insert into storage.buckets (id, name, public)
values ('event-resources', 'event-resources', false)
on conflict (id) do update set public = false;

drop policy if exists "Admin write assets" on storage.objects;
drop policy if exists "Staff manage assets" on storage.objects;
create policy "Staff manage assets" on storage.objects for all to authenticated
  using (bucket_id = 'assets' and private.is_staff())
  with check (bucket_id = 'assets' and private.is_staff());

drop policy if exists "Members read event resource files" on storage.objects;
drop policy if exists "Staff manage event resource files" on storage.objects;
create policy "Members read event resource files" on storage.objects for select to authenticated
  using (bucket_id = 'event-resources' and (private.is_approved_member() or private.is_staff()));
create policy "Staff manage event resource files" on storage.objects for all to authenticated
  using (bucket_id = 'event-resources' and private.is_staff())
  with check (bucket_id = 'event-resources' and private.is_staff());
