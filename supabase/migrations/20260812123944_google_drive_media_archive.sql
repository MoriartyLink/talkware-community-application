create table public.media_archives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_kind text not null check (media_kind in ('avatar', 'event_image', 'general_image')),
  provider text not null default 'google_drive' check (provider = 'google_drive'),
  provider_file_id text not null,
  provider_folder_id text,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type like 'image/%'),
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now(),
  unique (provider, provider_file_id)
);

create index media_archives_owner_created_idx
  on public.media_archives(owner_id, created_at desc);

alter table public.media_archives enable row level security;

create policy "Owners and staff read media archives"
on public.media_archives
for select
to authenticated
using ((select auth.uid()) = owner_id or private.is_staff());

revoke all on public.media_archives from anon, authenticated;
grant select on public.media_archives to authenticated;
