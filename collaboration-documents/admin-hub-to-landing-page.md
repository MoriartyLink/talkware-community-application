# Admin Hub to Landing Page Collaboration Document

## Connection Overview

The separately deployed Admin Hub (`../talkware_admin_hub`) and this landing page are connected through shared Supabase tables. The Admin Hub writes content; the public pages read that content with the public Supabase client.

```text
Talkware Admin Hub `/`
  -> Supabase Auth
  -> `staff_roles` authorization
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
- If a session exists, the Admin Hub reads `staff_roles` before rendering staff tools.
- `admin` can manage staff assignments and all content; `organizer` receives operational access and optional membership-review permission.
- An authenticated account without a staff role receives an access-denied screen.

## Member Operations

- The Community tab reviews membership applications and publishes member updates.
- Members can create an account with verified email/password or Google, then submit the same application from `/join`; staff review both paths here.
- Event operations show member/guest registrations and waitlist status, and upload presentation files to the private `event-resources` bucket.
- QR check-in selects an event, scans an opaque member pass, validates confirmed registration, and records one attendance row. The database automatically awards 5 points for Meetup attendance or 10 points for Training attendance.
- Existing Auth users are bootstrapped as admins by the member migration because Auth was admin-only before public Google signup.

## Shared Tables by Feature

### Upcoming Events

Admin tab: `Events`

- Writes to `events`.
- Member portal reads published, non-archived events; the landing page no longer lists upcoming events.
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

- `highlights`: select all, order by `num`.
- `contributors`: select all, highest contribution points first.
- `member_profiles`: select approved, opted-in public cards.

### Event Detail Page

`EventDetailPage.fetchData()` runs these queries:

- `events`: select one by route `id`.
- `event_media`: select by `event_id`, ordered by `sort_order`.
- `event_sections`: select by `event_id`, ordered by `sort_order`.
- `highlights`: select by `event_id`, newest `num` first.

## Operational Notes

- Public reads use the anon key, so RLS public `SELECT` policies are required.
- Admin writes require both Supabase Auth and a matching `staff_roles` row.
- `VITE_SUPABASE_ANON_KEY` must be configured for the frontend client.
- If `events.archived` or `highlights.event_id` is missing, current UI behavior will break or lose linking behavior.
- If the `assets` bucket or storage policies are missing, image uploads will fail.
