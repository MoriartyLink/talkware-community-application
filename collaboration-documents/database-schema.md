# Database and Security Contract

This document describes the database domains used by the public and member application. The ordered SQL files in `supabase/migrations/` are authoritative. `database_schema.sql` is a consolidated reference snapshot and must not be used to patch an existing environment.

## Migration workflow

This repository uses imperative migrations; `supabase/config.toml` does not configure declarative schema paths.

Create a migration through the CLI:

```bash
npx supabase migration new descriptive_change_name
```

Validate locally:

```bash
npx supabase db reset
npx supabase test db
```

Review a linked deployment before applying changes:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Never edit an already-applied migration. Add a new migration that moves the schema forward.

## Domain model

### Public content

| Table | Responsibility |
| --- | --- |
| `events` | Event lifecycle, publication, archive state, capacity, and highlight fields |
| `event_media` | Ordered event photos and videos |
| `event_sections` | Ordered structured content blocks for an event |
| `highlights` | Legacy/administrative highlight records retained by the baseline schema |
| `contributors` | Public community contributor records and contribution points |
| `contributor_tags` | Labels and colors for contributor categories |
| `founding_team`, `co_creators`, `volunteers` | Earlier team-content models retained for compatibility |

Current landing-page past-event cards come from published archived `events` with highlight content. Do not assume the `highlights` table is the active frontend source without checking current consumers.

### Membership and authorization

| Table | Responsibility |
| --- | --- |
| `member_profiles` | Member identity, profile, public contacts, skills, and listing preference |
| `membership_applications` | Application answers and review state |
| `staff_roles` | Explicit `admin`/`organizer` authorization |
| `member_passes` | Opaque QR tokens and pass lifecycle |

The Auth user ID is the identity anchor. User-editable Auth metadata is not an authorization source.

### Community communication

| Table | Responsibility |
| --- | --- |
| `community_posts` | Staff-authored announcements and publication state |
| `post_reactions` | One member reaction per post |

### Events and attendance

| Table | Responsibility |
| --- | --- |
| `event_registrations` | Member/guest registrations and confirmed/waitlisted/cancelled state |
| `event_resources` | Metadata for private presentation/resource objects |
| `event_attendance` | One verified member check-in per registration |
| `point_ledger` | Attendance awards, Peer Session charges, and refunds |

Balances are derived from ledger entries. Do not add a browser-writable balance column or update historical entries to simulate a balance change.

### Peer Sessions

| Table | Responsibility |
| --- | --- |
| `peer_session_preferences` | Member opt-in, topics, and discovery bio |
| `peer_session_requests` | Request details, fixed cost, participants, and lifecycle timestamps |

Supported durations and costs are enforced in the database:

| Duration | Cost |
| --- | --- |
| 15 minutes | 50 points |
| 30 minutes | 100 points |
| 60 minutes | 200 points |

Request creation, acceptance/decline, cancellation, completion, and refunds use trusted functions. Direct client writes to request lifecycle fields are intentionally restricted.

### Media archive

| Table | Responsibility |
| --- | --- |
| `media_archives` | Relationship between an owning member, private Drive original, and public Supabase copy |

## Important relationships

- `event_media.event_id` and `event_sections.event_id` belong to `events.id`.
- `event_registrations.event_id` belongs to an event; member registrations may reference `auth.users`.
- `event_attendance.registration_id` is unique, preventing duplicate check-ins for one registration.
- Attendance-linked ledger records preserve event and attendance provenance.
- Peer Session ledger records use request IDs as sources and unique indexes to prevent duplicate charges/refunds.
- `member_profiles.user_id`, applications, roles, and passes align with Auth user IDs.
- Deletion behavior is explicit; do not assume every foreign key cascades.

## Trusted functions

| Function | Purpose |
| --- | --- |
| `private.is_approved_member` | Reusable membership authorization predicate |
| `private.is_staff` | Staff authorization predicate |
| `private.can_review_members` | Membership-review capability predicate |
| `register_for_event` | Atomic member registration and waitlist assignment |
| `register_guest_for_event` | Constrained guest registration |
| `record_event_attendance` | Staff-authorized QR attendance recording |
| `private.award_event_attendance_points` | Trigger-driven attendance award |
| `create_peer_session_request` | Validates and charges a new request atomically |
| `respond_to_peer_session_request` | Accepts or declines as the requested peer |
| `cancel_peer_session_request` | Cancels as requester and refunds safely |
| `complete_peer_session_request` | Completes an accepted request as requester |
| `private.refund_peer_session_request` | Idempotent internal refund helper |

Security-definer functions must set a safe `search_path`, validate the caller, revoke default `PUBLIC` execution, and grant only the required role.

## RLS and Data API rules

- Enable RLS on every table in an exposed schema.
- Grant Data API privileges explicitly; grants make an operation available, while RLS decides which rows are allowed.
- `TO authenticated` proves only that a token maps to that Postgres role. Add ownership, participant, publication, or staff predicates.
- An `UPDATE` needs a readable row and should use both `USING` and `WITH CHECK` when protected columns must remain valid.
- Public policies must expose only deliberately published content.
- Member policies should use `auth.uid()` and avoid trusting user-submitted owner IDs.
- Test denied operations as carefully as successful operations.

## Storage

### `assets`

- Publicly readable web assets
- Staff-managed general content
- Approved members may manage only their own `member-avatars/{user_id}/...` path

### `event-resources`

- Private bucket
- Staff-managed objects
- Approved members receive time-limited signed URLs after authorization

Storage upserts require compatible insert, select, and update policies. Store object paths—not signed URLs—in application tables.

## Change checklist

- [ ] Migration was created through the configured workflow.
- [ ] Foreign keys and common query paths have suitable indexes.
- [ ] New exposed tables have RLS and explicit grants.
- [ ] Policies cover select, insert, update, and delete independently.
- [ ] Privileged functions validate identity and restrict execution.
- [ ] Existing public/member/Admin Hub queries remain compatible.
- [ ] `npx supabase db reset` succeeds.
- [ ] Database tests include allowed and denied cases.
- [ ] Remote migration dry-run was reviewed before deployment.
- [ ] This document and the Admin Hub contract were updated.
