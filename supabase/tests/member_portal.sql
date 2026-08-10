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
set token = '55555555-5555-5555-5555-555555555555'
where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.staff_roles (user_id, role, can_review_members)
values ('11111111-1111-1111-1111-111111111111', 'admin', true);

insert into public.events (id, title, type, archived, published, registration_open, capacity, starts_at)
values
  ('44444444-4444-4444-4444-444444444444', 'Capacity Test', 'Meetup', false, true, true, 1, now() + interval '1 day'),
  ('66666666-6666-6666-6666-666666666666', 'Guest Test', 'Training', false, true, true, null, now() + interval '2 days');

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
  if (select status from public.event_registrations where member_id = '22222222-2222-2222-2222-222222222222') <> 'confirmed' then
    raise exception 'First member was not confirmed';
  end if;
  if (select status from public.event_registrations where member_id = '33333333-3333-3333-3333-333333333333') <> 'waitlisted' then
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
  if (select status from public.event_registrations where member_id = '33333333-3333-3333-3333-333333333333') <> 'confirmed' then
    raise exception 'Waitlist promotion failed';
  end if;
end $$;

set local role anon;
select * from public.register_guest_for_event(
  '66666666-6666-6666-6666-666666666666', 'Guest Builder', 'guest@example.com', null
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"staff@example.com"}', true);
select * from public.record_event_attendance(
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
reset role;

do $$
begin
  if (select count(*) from public.event_attendance where event_id = '44444444-4444-4444-4444-444444444444') <> 1 then
    raise exception 'Attendance check-in failed';
  end if;
  if (select status from public.event_registrations where guest_email = 'guest@example.com') <> 'confirmed' then
    raise exception 'Guest registration failed';
  end if;
end $$;

rollback;
