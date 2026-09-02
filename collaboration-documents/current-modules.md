# Current Module Map

This document maps runtime responsibilities to source modules. It is an ownership guide, not a replacement for reading the code.

## Runtime composition

```text
src/main.tsx
  └─ AuthProvider
       └─ BrowserRouter
            ├─ Public/account routes
            └─ MemberRoute
                 └─ CommunityLayout
                      └─ Protected route pages
```

The frontend is a React 19 single-page application built by Vite. Supabase provides Auth, PostgreSQL through the Data API, Storage, and Edge Functions. Tailwind CSS supplies utility styling; Motion and Lucide support animation and icons.

## Application shell

### `src/main.tsx`

Mounts the React application and imports global styles.

### `src/App.tsx`

Owns route registration, lazy page loading, the shared suspense boundary, and the session-scoped splash transition.

Public and account routes:

- `/`
- `/event/:id`
- `/auth`
- `/auth/callback`
- `/reset-password`
- `/join`
- `/application-status`

Protected routes inherit both `MemberRoute` and `CommunityLayout`:

- `/community`
- `/community/events`
- `/community/updates`
- `/community/mini-apps`
- `/community/mini-apps/peer-session`
- `/community/profile`
- `/member/points`

### `src/components/MemberRoute.tsx`

Enforces the member-route state machine:

```text
loading → full-page loader
no session → /auth
session without application/staff role → /join
non-approved application without staff role → /application-status
approved member or staff → protected route
```

This guard is a navigation feature. Database RLS remains the authorization boundary.

### `src/components/CommunityLayout.tsx`

Provides the shared member header, desktop sidebar, mobile navigation, QR popover, sign-out action, and route outlet. New protected pages should reuse this layout instead of creating another member shell.

## Authentication and onboarding

### `src/contexts/AuthContext.tsx`

Restores the Supabase session, subscribes to auth changes, and loads the signed-in user's profile, application, and staff role. It also owns Google OAuth, email/password registration and sign-in, confirmation resend, password reset, password update, and sign-out.

### `src/pages/AuthPage.tsx`

Presents sign-in, registration, and forgot-password modes. It preserves the intended destination so OAuth can return users to the route they originally requested.

### `src/pages/AuthCallbackPage.tsx`

Completes the auth redirect and restores the intended post-authentication destination.

### `src/pages/ApplicationPage.tsx`

Creates the member profile and membership application for a signed-in user.

### `src/pages/ApplicationStatusPage.tsx`

Shows pending, approved, or rejected membership state.

## Public experience

### `src/pages/LandingPage.tsx`

Renders community storytelling and public discovery. Current data sources are:

- Published archived `events` that contain highlight content
- `contributors`, ordered by contribution points
- `contributor_tags`
- Opt-in `member_profiles`

The landing page does not list upcoming events; those belong in the member workspace.

### `src/pages/EventDetailPage.tsx`

Loads an event plus ordered `event_media` and `event_sections`. It composes registration, resources, sharing, image galleries, video embeds, and structured event content.

### Shared event components

- `EventRegistrationSection.tsx` handles member and guest registration paths.
- `EventResourcesSection.tsx` lists authorized resources and opens signed download URLs.
- `MarkdownContent.tsx` renders trusted community post content consistently.

## Member workspace

### `src/pages/community/CommunityHomePage.tsx`

Loads the next published, non-archived events, recent published posts, and event cover photos.

### `src/pages/community/CommunityEventsPage.tsx`

Loads upcoming events, the current member's active registrations, and event photos. Registration uses the trusted `register_for_event` RPC; cancellation updates only rows allowed by RLS.

### `src/pages/community/CommunityUpdatesPage.tsx`

Loads published posts and reactions. Members can create, replace, or remove only their own reaction.

### `src/pages/community/MemberProfilePage.tsx`

Updates member profile fields, public-listing preferences, avatar media, and password settings. Avatar uploads produce an optimized public copy and may archive the original through the Edge Function.

### `src/pages/member/MemberPointsPage.tsx`

Displays the authenticated member's point ledger and computed balance.

### `src/pages/community/MiniAppsPage.tsx`

Renders the code-owned Mini App registry from `src/config/miniApps.ts`.

### `src/pages/community/PeerSessionPage.tsx`

Implements the Peer Sessions beta: discovery, availability, request creation, request lifecycle, and point balance. Sensitive transitions use database RPCs so costs, refunds, and state checks are not controlled by the browser.

`src/pages/community/MemberNetworkPage.tsx` also exists as a member-directory page, but it is not currently registered in `src/App.tsx`. Treat it as inactive until a protected route and navigation decision are added together.

## Shared libraries and types

- `src/lib/supabase.ts`: single browser Supabase client; reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/community.ts`: event date formatting, sharing, and signed resource URLs.
- `src/lib/images.ts`: browser-side image resizing and WebP conversion.
- `src/types/community.ts`: shared member, event, registration, post, ledger, and Peer Session contracts.
- `src/config/miniApps.ts`: Mini App metadata registry.

## Backend modules

- `supabase/migrations/`: ordered schema and policy history; authoritative for database evolution.
- `supabase/tests/member_portal.sql`: database behavior and authorization checks.
- `supabase/functions/archive-image/`: authenticated Google Drive archival endpoint.
- `supabase/seed.sql`: local-only representative seed data.
- `database_schema.sql`: consolidated reference snapshot; not the migration path for an existing deployment.

## External ownership

The sibling `../talkware_admin_hub` repository owns staff content operations. It is deployed separately and must not be imported into this frontend bundle. Both applications coordinate through reviewed database and storage contracts.
