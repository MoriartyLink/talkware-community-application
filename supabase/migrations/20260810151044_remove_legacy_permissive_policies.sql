-- Remove policies created by the original dashboard-era setup. They grant every
-- authenticated user unrestricted writes and would override the staff-only
-- policies installed by the member portal migration.

drop policy if exists "Allow public read-only access for events" on public.events;
drop policy if exists "Allow admin full access for events" on public.events;

drop policy if exists "Allow public read-only access for highlights" on public.highlights;
drop policy if exists "Allow admin full access for highlights" on public.highlights;

drop policy if exists "Allow public read-only access for co_creators" on public.co_creators;
drop policy if exists "Allow admin full access for co_creators" on public.co_creators;

drop policy if exists "Allow public read-only access for volunteers" on public.volunteers;
drop policy if exists "Allow admin full access for volunteers" on public.volunteers;

drop policy if exists "Allow public read-only access for founding_team" on public.founding_team;
drop policy if exists "Allow admin full access for founding_team" on public.founding_team;

drop policy if exists "Allow public read-only access for contributor tags" on public.contributor_tags;
drop policy if exists "Allow admin full access for contributor tags" on public.contributor_tags;

drop policy if exists "Allow public read-only access for contributors" on public.contributors;
drop policy if exists "Allow admin full access for contributors" on public.contributors;
