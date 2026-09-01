-- Peer Sessions Mini App and a backwards-compatible general points ledger.

alter table public.point_ledger
  alter column event_id drop not null,
  alter column attendance_id drop not null,
  alter column event_type drop not null,
  add column if not exists source_type text,
  add column if not exists source_id uuid;

alter table public.point_ledger drop constraint if exists point_ledger_points_check;
alter table public.point_ledger
  add constraint point_ledger_points_nonzero check (points <> 0),
  add constraint point_ledger_source_fields check (
    (source_type = 'event_attendance' and event_id is not null and attendance_id is not null and event_type is not null)
    or
    (source_type in ('peer_session', 'peer_session_refund') and source_id is not null and event_id is null and attendance_id is null and event_type is null)
  );

update public.point_ledger
set source_type = 'event_attendance', source_id = attendance_id
where source_type is null;

alter table public.point_ledger alter column source_type set not null;

create unique index point_ledger_peer_session_source_uidx
  on public.point_ledger(member_id, source_type, source_id)
  where source_type in ('peer_session', 'peer_session_refund');

create table public.peer_session_preferences (
  user_id uuid primary key references public.member_profiles(user_id) on delete cascade,
  enabled boolean not null default false,
  topics text[] not null default '{}',
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(topics) <= 20)
);

create table public.peer_session_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.member_profiles(user_id) on delete restrict,
  peer_id uuid not null references public.member_profiles(user_id) on delete restrict,
  topic text not null check (char_length(trim(topic)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  duration_minutes integer not null check (duration_minutes in (15, 30, 60)),
  points_cost integer not null check (
    (duration_minutes = 15 and points_cost = 50)
    or (duration_minutes = 30 and points_cost = 100)
    or (duration_minutes = 60 and points_cost = 200)
  ),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  proposed_start_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> peer_id)
);

create index peer_session_requests_requester_created_idx
  on public.peer_session_requests(requester_id, created_at desc);
create index peer_session_requests_peer_created_idx
  on public.peer_session_requests(peer_id, created_at desc);
create index peer_session_preferences_enabled_idx
  on public.peer_session_preferences(enabled, updated_at desc);

alter table public.peer_session_preferences enable row level security;
alter table public.peer_session_requests enable row level security;

create policy "Approved members read enabled peer preferences"
on public.peer_session_preferences for select to authenticated
using (user_id = (select auth.uid()) or (enabled and private.is_approved_member()));

create policy "Members create own peer preference"
on public.peer_session_preferences for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_approved_member());

create policy "Members update own peer preference"
on public.peer_session_preferences for update to authenticated
using (user_id = (select auth.uid()) and private.is_approved_member())
with check (user_id = (select auth.uid()) and private.is_approved_member());

create policy "Participants read peer session requests"
on public.peer_session_requests for select to authenticated
using (
  private.is_approved_member()
  and ((select auth.uid()) = requester_id or (select auth.uid()) = peer_id or private.is_staff())
);

revoke all on public.peer_session_preferences from anon, authenticated;
grant select, insert, update on public.peer_session_preferences to authenticated;
revoke all on public.peer_session_requests from anon, authenticated;
grant select on public.peer_session_requests to authenticated;

create or replace function public.create_peer_session_request(
  p_peer_id uuid,
  p_topic text,
  p_description text,
  p_duration_minutes integer,
  p_proposed_start_at timestamptz default null
)
returns public.peer_session_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := auth.uid();
  calculated_cost integer;
  available_points integer;
  created_request public.peer_session_requests;
begin
  if requester is null or not private.is_approved_member(requester) then
    raise exception 'Approved community membership is required';
  end if;
  if p_peer_id = requester then
    raise exception 'You cannot request a session with yourself';
  end if;
  if not private.is_approved_member(p_peer_id) or not exists (
    select 1 from public.peer_session_preferences
    where user_id = p_peer_id and enabled
  ) then
    raise exception 'This member is not accepting Peer Session requests';
  end if;
  if char_length(trim(coalesce(p_topic, ''))) not between 3 and 120 then
    raise exception 'Topic must be between 3 and 120 characters';
  end if;
  if char_length(trim(coalesce(p_description, ''))) not between 10 and 2000 then
    raise exception 'Description must be between 10 and 2000 characters';
  end if;

  calculated_cost := case p_duration_minutes
    when 15 then 50 when 30 then 100 when 60 then 200 else null
  end;
  if calculated_cost is null then
    raise exception 'Unsupported session duration';
  end if;

  -- Serialize wallet mutations for this member to prevent concurrent overspending.
  perform pg_advisory_xact_lock(hashtextextended(requester::text, 0));
  select coalesce(sum(points), 0)::integer into available_points
  from public.point_ledger where member_id = requester;
  if available_points < calculated_cost then
    raise exception 'Insufficient Talkware points';
  end if;

  insert into public.peer_session_requests (
    requester_id, peer_id, topic, description, duration_minutes, points_cost, proposed_start_at
  ) values (
    requester, p_peer_id, trim(p_topic), trim(p_description), p_duration_minutes, calculated_cost, p_proposed_start_at
  ) returning * into created_request;

  insert into public.point_ledger (
    member_id, points, reason, earned_at, source_type, source_id
  ) values (
    requester, -calculated_cost, 'Peer session request', now(), 'peer_session', created_request.id
  );

  return created_request;
end;
$$;

create or replace function private.refund_peer_session_request(
  selected_request public.peer_session_requests,
  next_status text
)
returns public.peer_session_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.peer_session_requests;
begin
  insert into public.point_ledger (
    member_id, points, reason, earned_at, source_type, source_id
  ) values (
    selected_request.requester_id,
    selected_request.points_cost,
    'Peer session refund',
    now(),
    'peer_session_refund',
    selected_request.id
  ) on conflict (member_id, source_type, source_id)
    where source_type in ('peer_session', 'peer_session_refund') do nothing;

  update public.peer_session_requests
  set status = next_status,
      declined_at = case when next_status = 'declined' then now() else declined_at end,
      cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
      updated_at = now()
  where id = selected_request.id
  returning * into updated_request;
  return updated_request;
end;
$$;

create or replace function public.respond_to_peer_session_request(p_request_id uuid, p_accept boolean)
returns public.peer_session_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_request public.peer_session_requests;
begin
  select * into selected_request from public.peer_session_requests
  where id = p_request_id for update;
  if selected_request.id is null or selected_request.peer_id <> auth.uid() then
    raise exception 'Only the requested peer can respond to this request';
  end if;
  if selected_request.status <> 'pending' then
    raise exception 'This request is no longer pending';
  end if;
  if p_accept then
    update public.peer_session_requests
    set status = 'accepted', accepted_at = now(), updated_at = now()
    where id = p_request_id returning * into selected_request;
    return selected_request;
  end if;
  return private.refund_peer_session_request(selected_request, 'declined');
end;
$$;

create or replace function public.cancel_peer_session_request(p_request_id uuid)
returns public.peer_session_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_request public.peer_session_requests;
begin
  select * into selected_request from public.peer_session_requests
  where id = p_request_id for update;
  if selected_request.id is null or selected_request.requester_id <> auth.uid() then
    raise exception 'Only the requester can cancel this request';
  end if;
  if selected_request.status not in ('pending', 'accepted') then
    raise exception 'This request cannot be cancelled';
  end if;
  return private.refund_peer_session_request(selected_request, 'cancelled');
end;
$$;

create or replace function public.complete_peer_session_request(p_request_id uuid)
returns public.peer_session_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_request public.peer_session_requests;
begin
  select * into selected_request from public.peer_session_requests
  where id = p_request_id for update;
  if selected_request.id is null or selected_request.requester_id <> auth.uid() then
    raise exception 'Only the requester can complete this session';
  end if;
  if selected_request.status <> 'accepted' then
    raise exception 'Only accepted sessions can be completed';
  end if;
  update public.peer_session_requests
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_request_id returning * into selected_request;
  return selected_request;
end;
$$;

revoke all on function public.create_peer_session_request(uuid, text, text, integer, timestamptz) from public;
revoke all on function public.respond_to_peer_session_request(uuid, boolean) from public;
revoke all on function public.cancel_peer_session_request(uuid) from public;
revoke all on function public.complete_peer_session_request(uuid) from public;
revoke all on function private.refund_peer_session_request(public.peer_session_requests, text) from public;
grant execute on function public.create_peer_session_request(uuid, text, text, integer, timestamptz) to authenticated;
grant execute on function public.respond_to_peer_session_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_peer_session_request(uuid) to authenticated;
grant execute on function public.complete_peer_session_request(uuid) to authenticated;
