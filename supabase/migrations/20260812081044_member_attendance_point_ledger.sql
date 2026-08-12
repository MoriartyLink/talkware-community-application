create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  attendance_id uuid not null unique references public.event_attendance(id) on delete cascade,
  points integer not null check (points > 0),
  reason text not null,
  event_type text not null check (event_type in ('Meetup', 'Training')),
  earned_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index point_ledger_member_earned_idx
  on public.point_ledger(member_id, earned_at desc);
create index point_ledger_event_idx
  on public.point_ledger(event_id);

do $$
begin
  if exists (
    select 1
    from public.event_attendance as attendance
    join public.events as event on event.id = attendance.event_id
    where event.type is null or event.type not in ('Meetup', 'Training')
  ) then
    raise exception 'Existing attendance has an event type without a point award';
  end if;
end $$;

insert into public.point_ledger (
  member_id, event_id, attendance_id, points, reason, event_type, earned_at
)
select
  attendance.member_id,
  attendance.event_id,
  attendance.id,
  case event.type when 'Meetup' then 5 when 'Training' then 10 end,
  'Event attendance',
  event.type,
  attendance.checked_in_at
from public.event_attendance as attendance
join public.events as event on event.id = attendance.event_id
on conflict (attendance_id) do nothing;

create or replace function private.award_event_attendance_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendance_event_type text;
  attendance_points integer;
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Organizer access is required';
  end if;

  select event.type into attendance_event_type
  from public.events as event
  where event.id = new.event_id;

  attendance_points := case attendance_event_type
    when 'Meetup' then 5
    when 'Training' then 10
    else null
  end;

  if attendance_points is null then
    raise exception 'Event type does not have an attendance point award';
  end if;

  insert into public.point_ledger (
    member_id, event_id, attendance_id, points, reason, event_type, earned_at
  ) values (
    new.member_id, new.event_id, new.id, attendance_points,
    'Event attendance', attendance_event_type, new.checked_in_at
  )
  on conflict (attendance_id) do nothing;

  return new;
end;
$$;

revoke all on function private.award_event_attendance_points() from public, anon, authenticated;

create trigger award_event_attendance_points
after insert on public.event_attendance
for each row execute function private.award_event_attendance_points();

alter table public.point_ledger enable row level security;

create policy "Members read own point ledger"
on public.point_ledger for select to authenticated
using ((select auth.uid()) = member_id or private.is_staff());

revoke all on public.point_ledger from anon, authenticated;
grant select on public.point_ledger to authenticated;
