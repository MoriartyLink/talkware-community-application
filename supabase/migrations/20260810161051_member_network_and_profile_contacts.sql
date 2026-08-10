alter table public.member_profiles
  add column if not exists telegram_url text,
  add column if not exists contact_email text;

alter table public.member_profiles
  drop constraint if exists member_profiles_telegram_url_length,
  add constraint member_profiles_telegram_url_length
    check (telegram_url is null or char_length(telegram_url) <= 300),
  drop constraint if exists member_profiles_contact_email_length,
  add constraint member_profiles_contact_email_length
    check (contact_email is null or char_length(contact_email) <= 320);

drop policy if exists "Members upload own avatars" on storage.objects;
create policy "Members upload own avatars" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'member-avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.is_approved_member()
);

drop policy if exists "Members update own avatars" on storage.objects;
create policy "Members update own avatars" on storage.objects
for update to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'member-avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'member-avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.is_approved_member()
);

drop policy if exists "Members delete own avatars" on storage.objects;
create policy "Members delete own avatars" on storage.objects
for delete to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'member-avatars'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
