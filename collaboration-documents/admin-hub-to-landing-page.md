# Admin Hub to Landing Page Collaboration Document

## Connection Overview

The separately deployed Admin Hub (`../talkware_admin_hub`) and this landing page are connected through shared Supabase tables. The Admin Hub writes content; the public pages read that content with the public Supabase client.

```text
Talkware Admin Hub `/`
  -> Supabase Auth
  -> INSERT / UPDATE / DELETE content tables
  -> Supabase Storage uploads

/
  -> SELECT content tables
  -> render landing page sections

/event/:id
  -> SELECT event detail tables
  -> render event detail page
```

## Authentication Boundary

- The separate Admin Hub uses `supabase.auth.getSession()` and `onAuthStateChange()`.
- If no session exists, the admin login form is shown.
- If a session exists, admin content management is shown.
- Database write access depends on Supabase RLS policies for the `authenticated` role.

## Shared Tables by Feature

### Upcoming Events

Admin tab: `Events`

- Writes to `events`.
- Public landing page reads `events` with `archived = false`.
- Admin dashboard reads all events, including archived ones.
- Archive button toggles `events.archived`.

### Past Events

Admin tab: `Past Events`

- Writes to `highlights`.
- Landing page reads `highlights` and renders cards in the Past Events section.
- If `highlights.event_id` is set, the landing card links to `/event/{event_id}`.
- Event detail page also reads highlights where `event_id` equals the route event ID.

### Event Details

Admin location: edit an existing event in the `Events` tab.

- Writes photos and videos to `event_media`.
- Writes structured content blocks to `event_sections`.
- Event detail page reads both by `event_id`.
- Media and sections only appear on `/event/:id`; they do not render directly on the landing page.

### Founding Team

Admin tab: `Founding Team`

- Writes to `founding_team`.
- Landing page reads `founding_team` ordered by `sort_order`.
- `active` currently affects opacity, not visibility.

### Co-creators

Admin tab: `Co-creators`

- Writes to `co_creators`.
- Landing page reads `co_creators` ordered by `created_at`.

### Volunteers

Admin tab: `Volunteers`

- Writes to `volunteers`.
- Landing page reads `volunteers` ordered by `created_at`.

## Image Flow

1. Admin selects an image file.
2. `handleFileUpload` uploads the file to Supabase Storage bucket `assets`.
3. Supabase returns a public URL.
4. Admin form stores that URL in `image_url`.
5. Landing page reads `image_url` and renders it in cards.

## Public Page Data Flow

### Landing Page

`LandingPage.fetchData()` runs these queries:

- `events`: select all, `archived = false`, newest first.
- `highlights`: select all, order by `num`.
- `co_creators`: select all, oldest first.
- `volunteers`: select all, oldest first.
- `founding_team`: select all, order by `sort_order`.

### Event Detail Page

`EventDetailPage.fetchData()` runs these queries:

- `events`: select one by route `id`.
- `event_media`: select by `event_id`, ordered by `sort_order`.
- `event_sections`: select by `event_id`, ordered by `sort_order`.
- `highlights`: select by `event_id`, newest `num` first.

## Operational Notes

- Public reads use the anon key, so RLS public `SELECT` policies are required.
- Admin writes require signed-in Supabase Auth users.
- `VITE_SUPABASE_ANON_KEY` must be configured for the frontend client.
- If `events.archived` or `highlights.event_id` is missing, current UI behavior will break or lose linking behavior.
- If the `assets` bucket or storage policies are missing, image uploads will fail.
