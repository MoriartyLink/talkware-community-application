begin;

insert into auth.users (
  id, instance_id, email, aud, role, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'staff@example.com', 'authenticated', 'authenticated', '', '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'one@example.com', 'authenticated', 'authenticated', '', '{}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'two@example.com', 'authenticated', 'authenticated', '', '{}', '{}', now(), now());

insert into public.member_profiles (user_id, display_name) values
  ('22222222-2222-2222-2222-222222222222', 'Member One'),
  ('33333333-3333-3333-3333-333333333333', 'Member Two');

insert into public.membership_applications (user_id, email, role_title, interests, motivation) values
  ('22222222-2222-2222-2222-222222222222', 'one@example.com', 'Developer', 'React', 'Build with the community'),
  ('33333333-3333-3333-3333-333333333333', 'two@example.com', 'Designer', 'Products', 'Learn with the community');

update public.membership_applications set status = 'approved';
update public.member_passes
set token = case user_id
  when '22222222-2222-2222-2222-222222222222' then '77777777-7777-4777-8777-777777777777'::uuid
  when '33333333-3333-3333-3333-333333333333' then '55555555-5555-5555-5555-555555555555'::uuid
end
where user_id in (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into public.staff_roles (user_id, role, can_review_members)
values ('11111111-1111-1111-1111-111111111111', 'admin', true);

insert into public.events (id, title, type, archived, published, registration_open, capacity, starts_at)
values
  ('44444444-4444-4444-4444-444444444444', 'Capacity Test', 'Meetup', false, true, true, 1, now() + interval '1 day'),
  ('66666666-6666-6666-6666-666666666666', 'Guest Test', 'Training', false, true, true, null, now() + interval '2 days'),
  ('88888888-8888-4888-8888-888888888888', 'Historical Meetup', 'Meetup', false, true, true, null, now() - interval '30 days');

insert into public.event_registrations (
  id, event_id, registration_kind, member_id, status
) values (
  '99999999-9999-4999-8999-999999999999',
  '88888888-8888-4888-8888-888888888888',
  'member',
  '22222222-2222-2222-2222-222222222222',
  'confirmed'
);

alter table public.event_attendance disable trigger award_event_attendance_points;
insert into public.event_attendance (
  id, event_id, registration_id, member_id, scanned_by, checked_in_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  now() - interval '30 days'
);
alter table public.event_attendance enable trigger award_event_attendance_points;
update public.events
set archived = true, registration_open = false
where id = '88888888-8888-4888-8888-888888888888';

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

do $$
begin
  if (select count(*) from public.point_ledger where attendance_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1
    or (select points from public.point_ledger where attendance_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 5 then
    raise exception 'Historical attendance backfill failed';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"one@example.com"}', true);
select * from public.register_for_event('44444444-4444-4444-4444-444444444444');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"two@example.com"}', true);
select * from public.register_for_event('44444444-4444-4444-4444-444444444444');
reset role;

do $$
begin
  if (select status from public.event_registrations where event_id = '44444444-4444-4444-4444-444444444444' and member_id = '22222222-2222-2222-2222-222222222222') <> 'confirmed' then
    raise exception 'First member was not confirmed';
  end if;
  if (select status from public.event_registrations where event_id = '44444444-4444-4444-4444-444444444444' and member_id = '33333333-3333-3333-3333-333333333333') <> 'waitlisted' then
    raise exception 'Second member was not waitlisted';
  end if;
  if (select count(*) from public.member_passes where active) <> 2 then
    raise exception 'Approval did not issue both member passes';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"one@example.com"}', true);
update public.event_registrations
set status = 'cancelled', updated_at = now()
where event_id = '44444444-4444-4444-4444-444444444444'
  and member_id = '22222222-2222-2222-2222-222222222222';
reset role;

do $$
begin
  if (select status from public.event_registrations where event_id = '44444444-4444-4444-4444-444444444444' and member_id = '33333333-3333-3333-3333-333333333333') <> 'confirmed' then
    raise exception 'Waitlist promotion failed';
  end if;
end $$;

set local role anon;
select * from public.register_guest_for_event(
  '66666666-6666-6666-6666-666666666666', 'Guest Builder', 'guest@example.com', null
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"one@example.com"}', true);
select * from public.register_for_event('66666666-6666-6666-6666-666666666666');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"staff@example.com"}', true);
select * from public.record_event_attendance(
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
select * from public.record_event_attendance(
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
select * from public.record_event_attendance(
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-4777-8777-777777777777'
);
reset role;

do $$
begin
  if (select count(*) from public.event_attendance) <> 3 then
    raise exception 'Attendance check-in failed';
  end if;
  if (select count(*) from public.point_ledger) <> 3 then
    raise exception 'Attendance did not create exactly one point award per check-in';
  end if;
  if (select coalesce(sum(points), 0) from public.point_ledger) <> 20 then
    raise exception 'Event type point values are incorrect';
  end if;
  if (select points from public.point_ledger where event_id = '44444444-4444-4444-4444-444444444444') <> 5 then
    raise exception 'Meetup attendance did not award 5 points';
  end if;
  if (select points from public.point_ledger where event_id = '66666666-6666-6666-6666-666666666666') <> 10 then
    raise exception 'Training attendance did not award 10 points';
  end if;
  if (select status from public.event_registrations where guest_email = 'guest@example.com') <> 'confirmed' then
    raise exception 'Guest registration failed';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"two@example.com"}', true);
do $$
begin
  if (select count(*) from public.point_ledger) <> 1
    or (select coalesce(sum(points), 0) from public.point_ledger) <> 5 then
    raise exception 'Member point ledger RLS exposed another member or hid the owner row';
  end if;

  begin
    insert into public.point_ledger (
      member_id, event_id, attendance_id, points, reason, event_type, earned_at
    )
    select member_id, event_id, id, 999, 'Forged award', 'Meetup', checked_in_at
    from public.event_attendance
    where member_id = '33333333-3333-3333-3333-333333333333';
    raise exception 'Member was able to write directly to the point ledger';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"staff@example.com"}', true);
do $$
begin
  if (select count(*) from public.point_ledger) <> 3 then
    raise exception 'Staff could not read all point ledger rows';
  end if;
end $$;
delete from public.event_attendance
where event_id = '66666666-6666-6666-6666-666666666666'
  and member_id = '22222222-2222-2222-2222-222222222222';
reset role;

do $$
begin
  if (select count(*) from public.point_ledger) <> 2
    or (select coalesce(sum(points), 0) from public.point_ledger) <> 10 then
    raise exception 'Deleting attendance did not remove its point award';
  end if;
end $$;

-- Peer Sessions: secure opt-in, atomic spending, participant-only actions,
-- server-side pricing, and exactly-once refunds.
update public.point_ledger
set points = 300
where member_id = '22222222-2222-2222-2222-222222222222';

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"two@example.com"}', true);
insert into public.peer_session_preferences (user_id, enabled, topics, bio)
values ('33333333-3333-3333-3333-333333333333', true, array['React', 'Design'], 'Happy to help.');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"one@example.com"}', true);
select id as peer_request_id
from public.create_peer_session_request(
  '33333333-3333-3333-3333-333333333333', 'Architecture review',
  'Please review the structure of my community application.', 30, now() + interval '2 days'
);

do $$
begin
  if (select coalesce(sum(points), 0) from public.point_ledger where member_id = auth.uid()) <> 200 then
    raise exception 'Peer Session spending did not deduct the server-calculated cost';
  end if;
  if (select points_cost from public.peer_session_requests where requester_id = auth.uid()) <> 100 then
    raise exception 'Peer Session pricing was not calculated correctly';
  end if;
  begin
    perform public.create_peer_session_request(
      auth.uid(), 'Self request', 'This request should never be created.', 15, null
    );
    raise exception 'Member created a request with themselves';
  exception when raise_exception then
    if sqlerrm = 'Member created a request with themselves' then raise; end if;
  end;
  begin
    perform public.respond_to_peer_session_request(
      (select id from public.peer_session_requests where requester_id = auth.uid()), true
    );
    raise exception 'Requester responded to their own outgoing request';
  exception when raise_exception then
    if sqlerrm = 'Requester responded to their own outgoing request' then raise; end if;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","email":"two@example.com"}', true);
select status from public.respond_to_peer_session_request(
  (select id from public.peer_session_requests where peer_id = auth.uid()), false
);
reset role;

do $$
declare
  request_id uuid := (select id from public.peer_session_requests limit 1);
begin
  if (select status from public.peer_session_requests where id = request_id) <> 'declined' then
    raise exception 'Requested peer could not decline the request';
  end if;
  if (select count(*) from public.point_ledger where source_type = 'peer_session_refund' and source_id = request_id) <> 1 then
    raise exception 'Decline did not create exactly one refund';
  end if;
  if (select coalesce(sum(points), 0) from public.point_ledger where member_id = '22222222-2222-2222-2222-222222222222') <> 300 then
    raise exception 'Decline did not fully restore the requester balance';
  end if;
end $$;

rollback;
