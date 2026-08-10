-- Talkware Community Landing baseline database schema
-- Run this in the Supabase SQL Editor for a new contributor setup.

create extension if not exists pgcrypto;

create table if not exists public.events (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    date text,
    type text check (type in ('Meetup', 'Training')),
    location text,
    speaker text,
    description text,
    link text,
    archived boolean default false,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.highlights (
    id uuid default gen_random_uuid() primary key,
    num text,
    title text,
    date text,
    place text,
    time text,
    image_url text,
    highlight text not null,
    event_id uuid references public.events(id) on delete set null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.co_creators (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    role text not null,
    image_url text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.volunteers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    role text not null,
    image_url text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.founding_team (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    role text not null,
    image_url text,
    active boolean default true not null,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.contributor_tags (
    value text primary key,
    label text not null,
    color text default '#34d399' not null,
    created_at timestamptz default now() not null
);

create table if not exists public.contributors (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    role text not null,
    tag text default 'volunteer' not null,
    image_url text,
    active boolean default true not null,
    points integer default 0 not null check (points >= 0),
    joined_at date default current_date not null,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    github_url text,
    linkedin_url text
);

create table if not exists public.event_media (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade not null,
    media_type text check (media_type in ('photo', 'video')) not null,
    title text,
    url text not null,
    caption text,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.event_sections (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade not null,
    section_type text check (section_type in ('highlight', 'activity', 'game', 'win')) not null,
    title text not null,
    description text,
    subtitle text,
    icon text,
    sort_order integer default 0,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists highlights_event_id_idx on public.highlights(event_id);
create index if not exists contributors_tag_sort_order_idx on public.contributors(tag, sort_order);
create index if not exists event_media_event_id_sort_order_idx on public.event_media(event_id, sort_order);
create index if not exists event_sections_event_id_sort_order_idx on public.event_sections(event_id, sort_order);

alter table public.events enable row level security;
alter table public.highlights enable row level security;
alter table public.co_creators enable row level security;
alter table public.volunteers enable row level security;
alter table public.founding_team enable row level security;
alter table public.contributor_tags enable row level security;
alter table public.contributors enable row level security;
alter table public.event_media enable row level security;
alter table public.event_sections enable row level security;

drop policy if exists "Public read events" on public.events;
drop policy if exists "Admin write events" on public.events;
drop policy if exists "Public read highlights" on public.highlights;
drop policy if exists "Admin write highlights" on public.highlights;
drop policy if exists "Public read co_creators" on public.co_creators;
drop policy if exists "Admin write co_creators" on public.co_creators;
drop policy if exists "Public read volunteers" on public.volunteers;
drop policy if exists "Admin write volunteers" on public.volunteers;
drop policy if exists "Public read founding_team" on public.founding_team;
drop policy if exists "Admin write founding_team" on public.founding_team;
drop policy if exists "Public read contributor_tags" on public.contributor_tags;
drop policy if exists "Admin write contributor_tags" on public.contributor_tags;
drop policy if exists "Public read contributors" on public.contributors;
drop policy if exists "Admin write contributors" on public.contributors;
drop policy if exists "Public read event_media" on public.event_media;
drop policy if exists "Admin write event_media" on public.event_media;
drop policy if exists "Public read event_sections" on public.event_sections;
drop policy if exists "Admin write event_sections" on public.event_sections;

create policy "Public read events" on public.events for select using (true);
create policy "Admin write events" on public.events for all to authenticated using (true) with check (true);

create policy "Public read highlights" on public.highlights for select using (true);
create policy "Admin write highlights" on public.highlights for all to authenticated using (true) with check (true);

create policy "Public read co_creators" on public.co_creators for select using (true);
create policy "Admin write co_creators" on public.co_creators for all to authenticated using (true) with check (true);

create policy "Public read volunteers" on public.volunteers for select using (true);
create policy "Admin write volunteers" on public.volunteers for all to authenticated using (true) with check (true);

create policy "Public read founding_team" on public.founding_team for select using (true);
create policy "Admin write founding_team" on public.founding_team for all to authenticated using (true) with check (true);

create policy "Public read contributor_tags" on public.contributor_tags for select using (true);
create policy "Admin write contributor_tags" on public.contributor_tags for all to authenticated using (true) with check (true);

create policy "Public read contributors" on public.contributors for select using (true);
create policy "Admin write contributors" on public.contributors for all to authenticated using (true) with check (true);

create policy "Public read event_media" on public.event_media for select using (true);
create policy "Admin write event_media" on public.event_media for all to authenticated using (true) with check (true);

create policy "Public read event_sections" on public.event_sections for select using (true);
create policy "Admin write event_sections" on public.event_sections for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read assets" on storage.objects;
drop policy if exists "Admin write assets" on storage.objects;

create policy "Public read assets" on storage.objects
for select using (bucket_id = 'assets');

create policy "Admin write assets" on storage.objects
for all to authenticated
using (bucket_id = 'assets')
with check (bucket_id = 'assets');
