# Database Schema Collaboration Document

## Canonical Schema Source

Use `database_schema.sql` for a clean installation. Apply the ordered files in `supabase/migrations` to existing deployments. Older SQL helper scripts are local-only and ignored.

The member portal adds `member_profiles`, `membership_applications`, `staff_roles`, `member_passes`, `community_posts`, `post_reactions`, `event_registrations`, `event_resources`, and `event_attendance`. Public tables use explicit Data API grants and RLS; presentation files live in the private `event-resources` bucket.

Membership applications are always submitted by an authenticated member account. Both verified email/password registration and Google OAuth produce that Auth identity, and RLS requires the application email to match the signed-in user's JWT email.

## Tables

### `events`

Stores public event announcements and event detail parent records.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `title` | `text` | Required |
| `date` | `text` | Display date/time string |
| `type` | `text` | Check: `Meetup`, `Training` |
| `location` | `text` | Optional |
| `speaker` | `text` | Optional |
| `description` | `text` | Optional |
| `link` | `text` | Optional registration URL |
| `archived` | `boolean` | Defaults to `false`; landing page hides archived events |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `highlights`

Stores past event cards on the landing page and optional related cards on event detail pages.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `num` | `text` | Display sequence such as `01` |
| `title` | `text` | Optional in SQL, treated as content by UI |
| `date` | `text` | Display date |
| `place` | `text` | Display venue |
| `time` | `text` | Display time |
| `image_url` | `text` | Public image URL |
| `highlight` | `text` | Required summary text |
| `event_id` | `uuid` | Optional FK to `events(id)` |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `co_creators`

Stores co-creator profile cards.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required |
| `role` | `text` | Required |
| `image_url` | `text` | Optional public image URL |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `volunteers`

Stores volunteer profile cards.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required |
| `role` | `text` | Required |
| `image_url` | `text` | Optional public image URL |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `founding_team`

Stores founding team profile cards.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required |
| `role` | `text` | Required |
| `image_url` | `text` | Optional public image URL |
| `active` | `boolean` | Defaults to `true`; currently changes opacity in UI |
| `sort_order` | `int` | Controls landing/admin ordering |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `contributor_tags`

Stores contributor category metadata from the live Supabase schema.

| Column | Type | Notes |
| --- | --- | --- |
| `value` | `text` | Primary key |
| `label` | `text` | Required display label |
| `color` | `text` | Required color value, defaults to `#34d399` |
| `created_at` | `timestamptz` | Defaults to current time |

### `contributors`

Stores contributor profile data from the live Supabase schema.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required |
| `role` | `text` | Required |
| `tag` | `text` | Required, defaults to `volunteer` |
| `image_url` | `text` | Optional public image URL |
| `active` | `boolean` | Defaults to `true` |
| `points` | `int` | Defaults to `0`, must be non-negative |
| `joined_at` | `date` | Defaults to current date |
| `sort_order` | `int` | Display order |
| `created_at` | `timestamptz` | Defaults to current UTC time |
| `github_url` | `text` | Optional |
| `linkedin_url` | `text` | Optional |

### `event_media`

Stores event detail photos and videos.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `event_id` | `uuid` | Required FK to `events(id)`, cascades on delete |
| `media_type` | `text` | Check: `photo`, `video` |
| `title` | `text` | Optional |
| `url` | `text` | Required media URL |
| `caption` | `text` | Optional |
| `sort_order` | `int` | Display order |
| `created_at` | `timestamptz` | Defaults to current UTC time |

### `event_sections`

Stores structured event detail content blocks.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `event_id` | `uuid` | Required FK to `events(id)`, cascades on delete |
| `section_type` | `text` | Check: `highlight`, `activity`, `game`, `win` |
| `title` | `text` | Required |
| `description` | `text` | Optional |
| `subtitle` | `text` | Optional |
| `icon` | `text` | Optional; currently stored but not dynamically rendered |
| `sort_order` | `int` | Display order |
| `created_at` | `timestamptz` | Defaults to current UTC time |

## Access Model

- Row Level Security is enabled on all content tables.
- Public users can read published events and event content, past highlights, contributors, and approved opt-in member profiles.
- Approved members can read community posts and resources and can manage only their own profile, registration status, and reaction.
- Staff writes require an `admin` or `organizer` row in `staff_roles`; authentication alone grants no content-management permission.
- Supabase Storage bucket `assets` is expected to be public.
- Public users can read `storage.objects` for `assets`.
- Staff manage `assets` and the private `event-resources` bucket; approved members can read event resources.

## Relationship Summary

- `highlights.event_id` optionally links a past event card to an event detail page.
- `event_media.event_id` and `event_sections.event_id` belong to one event.
- Deleting an event cascades to its media and sections.
