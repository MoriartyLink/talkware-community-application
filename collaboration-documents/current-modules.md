# Current Modules Collaboration Document

## Runtime Stack

- React 19 with Vite 6.
- TypeScript for application source.
- React Router for `/` and `/event/:id`.
- Supabase for PostgreSQL data, Auth, and Storage.
- Tailwind CSS 4 utilities through `src/index.css`.
- Motion and Lucide React for animation and icons.

## Source Modules

### `src/main.tsx`

Application entry point. It mounts the React app and loads the global stylesheet.

### `src/App.tsx`

Top-level router and splash orchestration.

- Shows `SplashScreen` first.
- Switches to page routes after the splash calls `onFinish`.
- Routes:
  - `/` -> `LandingPage`
  - `/event/:id` -> `EventDetailPage`
  - `/auth` and `/auth/callback` -> Google OAuth plus manual email/password registration, sign-in, and verification callback
  - `/join` and `/application-status` -> membership application workflow
  - `/community/*` -> protected member home, events, updates, QR pass, and profile

### `src/components/SplashScreen.tsx`

Intro screen component shown before route content. It receives an `onFinish` callback from `App`.

### `src/pages/LandingPage.tsx`

Public landing page.

- Reads public data from Supabase.
- Shows mission, past event highlights, story, contributors, opt-in approved community members, and footer/contact areas.
- Upcoming announcements have moved to the protected member portal.
- Uses fallback hardcoded past highlights only when the `highlights` table returns no rows.
- Uses `events.archived = false` for public upcoming events.
- Links past event cards to `/event/:event_id` when a highlight has `event_id`.

### `src/pages/EventDetailPage.tsx`

Public event detail page.

- Reads one event by route `id`.
- Reads `event_media`, `event_sections`, and linked `highlights`.
- Supports photo galleries, YouTube embeds, local video URLs, section groups, and related highlights.
- Supports public guest registration, member registration/waitlists, sharing, and approved-member resource downloads.

### Member modules

- `src/contexts/AuthContext.tsx` restores Supabase sessions, supports Google and email/password authentication, and loads the member application/profile/staff state.
- `src/components/MemberRoute.tsx` gates `/community/*` by approval, while staff retain access.
- `src/pages/community/*` implements announcements, registrations, update reactions, member profiles, and QR passes.

### `src/lib/supabase.ts`

Supabase client factory.

- Reads `VITE_SUPABASE_URL`, with a fallback project URL.
- Reads `VITE_SUPABASE_ANON_KEY`.
- Exports a shared `supabase` client.

The administration UI is maintained in the sibling project `../talkware_admin_hub` and is not part of this app's routes or production bundle.

## SQL and Data Files

### `database_schema.sql`

Complete clean-install schema. Existing deployments use the ordered migrations under `supabase/migrations`. The schema includes:

- Main content tables.
- Live contributor tables.
- `events.archived`.
- `highlights.event_id`.
- Event detail tables.
- Useful foreign-key indexes.
- RLS policies.
- Public `assets` bucket creation.
- Storage policies for the `assets` bucket.
- Member applications/profiles, explicit staff roles, posts/reactions, event registrations/waitlists, resources, private storage, passes, attendance, and hardened helper functions.

### Local-only SQL Archive

Older SQL scripts are kept locally under `.local-sql-archive/` and ignored by Git. Do not use them as the contributor setup path.

## Static Assets

- `public/splash-screen.mp4` is the splash video.
- UI references `/logo.png` and several `/assets/...` image paths. These must be available under `public/` at runtime or served by the hosting environment.
