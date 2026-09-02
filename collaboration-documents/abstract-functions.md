# Runtime Responsibility Map

This document identifies functions that define important product or security behavior. Small rendering helpers are intentionally omitted.

## Application lifecycle

### `App.finishSplash`

Location: `src/App.tsx`

Records splash completion in `sessionStorage` and reveals the router content. The splash appears only for the root route and once per browser tab session.

## Authentication

### `AuthProvider.loadMembership`

Location: `src/contexts/AuthContext.tsx`

Synchronizes the active Auth session with three application records:

- `member_profiles`
- `membership_applications`
- `staff_roles`

Consumers should read this state through `useAuth()` instead of issuing duplicate identity queries.

### Auth actions

Location: `src/contexts/AuthContext.tsx`

- `signInWithGoogle` stores the intended destination and starts OAuth.
- `signInWithPassword` authenticates a verified email/password account.
- `signUpWithPassword` creates an account and requests email confirmation.
- `resendSignupConfirmation` requests another confirmation message.
- `sendPasswordReset` starts password recovery.
- `updatePassword` updates the authenticated user's password.
- `signOut` ends the Supabase session.

Auth redirect URLs are derived from `window.location.origin`; production allow-lists must match the deployed origin.

## Public data loading

### `LandingPage.fetchData`

Location: `src/pages/LandingPage.tsx`

Loads archived published event highlights, contributors, contributor tags, and opt-in member profiles. Each section owns its empty state. Changing these queries changes the public data contract and may require corresponding RLS or Admin Hub updates.

### `EventDetailPage` data effect

Location: `src/pages/EventDetailPage.tsx`

Reloads when the route event ID changes and fetches:

- One `events` row
- Ordered `event_media`
- Ordered `event_sections`

### `getYouTubeEmbedId`

Location: `src/pages/EventDetailPage.tsx`

Normalizes supported YouTube URL forms into an embeddable video ID. Unsupported values return `null` and should continue to degrade safely.

## Event operations

### `register_for_event`

Called from `CommunityEventsPage` and `EventRegistrationSection`.

The database RPC validates eligibility and assigns confirmed or waitlisted status atomically. Do not replace it with a direct insert from the browser.

### `register_guest_for_event`

Called from `EventRegistrationSection`.

Creates a guest registration through a constrained database function. The UI collects the data; the database controls validation and capacity behavior.

### `shareEvent`

Location: `src/lib/community.ts`

Uses the Web Share API when available and falls back to copying the canonical event URL.

### `createResourceUrl`

Location: `src/lib/community.ts`

Creates a ten-minute signed URL for an authorized object in the private `event-resources` bucket.

## Profile media

### `createWebImage`

Location: `src/lib/images.ts`

Resizes an image to at most 1024 pixels on its longest side and converts it to WebP for public delivery.

### `MemberProfilePage.save`

Location: `src/pages/community/MemberProfilePage.tsx`

Validates and updates profile fields. For a new avatar it uploads the optimized copy to `assets/member-avatars/{user_id}/...`, stores the public URL, and invokes `archive-image` for the original.

The public copy may succeed when optional Drive archival fails; the UI should preserve that distinction.

### `archive-image` Edge Function

Location: `supabase/functions/archive-image/index.ts`

The function:

1. Validates the caller's access token.
2. Verifies the submitted owner ID belongs to the caller.
3. Validates the uploaded file type.
4. Exchanges the Google refresh token for an access token.
5. Uploads the original to the configured private Drive folder.
6. Records the Drive/public-copy relationship in `media_archives`.

Google credentials must remain server-side secrets.

## Peer Sessions

### `PeerSessionPage.loadData`

Loads opted-in peers, requests involving the current member, the member's availability preference, and point-ledger entries used to calculate balance.

### `create_peer_session_request`

Charges the fixed point cost and creates the request in one transaction. It validates membership, peer availability, request input, duration, and sufficient balance while serializing concurrent wallet mutations.

### Request lifecycle RPCs

- `respond_to_peer_session_request`: requested peer accepts or declines.
- `cancel_peer_session_request`: requester cancels pending or accepted work.
- `complete_peer_session_request`: requester marks an accepted session complete.
- `private.refund_peer_session_request`: issues an idempotent refund for decline/cancellation.

Do not reproduce these transitions with direct frontend writes.

## Attendance and points

### `record_event_attendance`

Accepts an event and opaque member-pass token, validates registration and staff authorization, and records one check-in.

### `private.award_event_attendance_points`

Awards points from verified attendance through a trigger. Peer Session charges and refunds extend the same ledger with explicit source types. The ledger is append-oriented; balances are derived from `sum(points)`.

## Change rule

When modifying one of these responsibilities, verify all callers, database policies, failure states, and Admin Hub dependencies. Update this document when the contract—not merely the implementation detail—changes.
