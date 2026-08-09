# Naming Conventions Collaboration Document

## Files and Folders

- React components and pages use PascalCase file names: `LandingPage.tsx`, `EventDetailPage.tsx`, `SplashScreen.tsx`.
- Shared libraries use lowercase names: `src/lib/supabase.ts`.
- SQL scripts use snake_case names. The contributor-facing schema is `database_schema.sql`.
- Generated/build output stays in standard folders: `dist/`, `node_modules/`.

## React and TypeScript

- Components use PascalCase: `LandingPage`, `EventDetailPage`, `SplashScreen`.
- Interfaces use PascalCase nouns: `Event`, `Highlight`, `CoCreator`, `Volunteer`, `FoundingTeamMember`.
- State setters follow React naming: `events` / `setEvents`, `loading` / `setLoading`.
- Event handlers use `handle` prefixes.
- Async data readers use `fetch` prefixes, such as `fetchData`.
- Constants use uppercase snake case: `REGISTER_URL`, `COMMUNITY_URL`.

## Database Naming

- Tables use lowercase snake_case:
  - `events`
  - `highlights`
  - `co_creators`
  - `volunteers`
  - `founding_team`
  - `contributor_tags`
  - `contributors`
  - `event_media`
  - `event_sections`
- Columns use lowercase snake_case:
  - `created_at`
  - `image_url`
  - `event_id`
  - `media_type`
  - `section_type`
  - `sort_order`
- IDs are UUID columns named `id`.
- Foreign keys use `{table_singular}_id`, for example `event_id`.

## Route Naming

- Public home route: `/`.
- Event detail route: `/event/:id`.

## Content Type Values

- `events.type` is limited to `Meetup` or `Training`.
- `event_media.media_type` is limited to `photo` or `video`.
- `event_sections.section_type` is limited to `highlight`, `activity`, `game`, or `win`.
