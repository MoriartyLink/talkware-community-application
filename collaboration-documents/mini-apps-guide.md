# Talkware Mini Apps: Beginner Contribution Guide

This guide explains how to add a Mini App to the protected Talkware Community portal.

Mini Apps are small, repository-owned React features that help members learn, contribute, collaborate, or connect. They are not Community Projects, uploaded websites, plugins, iframes, or user-provided JavaScript bundles.

## Current Foundation

The Mini Apps foundation has three parts:

| Part | Location | Purpose |
| --- | --- | --- |
| Launcher | `src/pages/community/MiniAppsPage.tsx` | Displays registered Mini Apps and the empty state |
| Registry | `src/config/miniApps.ts` | Stores each Mini App's public metadata in one place |
| Protected route | `src/App.tsx` | Connects a URL to the Mini App's React page |

The launcher route is:

```text
/community/mini-apps
```

It is already inside the existing `MemberRoute` and `CommunityLayout`. Do not add another router, authentication provider, or membership wrapper.

## Why This Structure Is a Good Pattern

The current foundation follows common production React practices:

- One registry is the source of truth for launcher metadata.
- Mini App pages are lazy-loaded with React `lazy` and the application's existing `Suspense` boundary.
- Routes remain explicit and reviewable in React Router.
- Authentication and membership checks are inherited from the existing protected route tree.
- Mini Apps reuse the application's design system, domain services, and backend.
- A `coming_soon` item is visible but not linked to an unfinished route.
- The registry is code-based instead of database-driven because Mini Apps are deployed application features.
- Users cannot upload or execute arbitrary HTML, JavaScript, React builds, or application bundles.

Useful official references:

- [React `lazy`](https://react.dev/reference/react/lazy)
- [React Router routing](https://reactrouter.com/start/declarative/routing)
- [OWASP guidance on unrestricted file uploads](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)

## Before You Start

Choose a short lowercase slug using words separated by hyphens.

Example:

```text
Name: Event Quiz
Slug: event-quiz
Route: /community/mini-apps/event-quiz
```

Keep these values consistent. The registry controls the launcher card, while `App.tsx` controls whether the URL actually works.

## Step 1: Create the Page

For a small Mini App, create a page under:

```text
src/pages/community/mini-apps/
```

Example file:

```text
src/pages/community/mini-apps/EventQuizPage.tsx
```

Example component:

```tsx
export default function EventQuizPage() {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">
        Mini App
      </p>
      <h1 className="text-4xl font-bold md:text-6xl">Event Quiz</h1>
      <p className="mt-4 max-w-2xl text-white/50">
        Test your knowledge after Talkware events.
      </p>
    </div>
  );
}
```

Use the existing Talkware spacing, typography, colors, cards, buttons, loaders, and feedback patterns. Do not introduce a separate design system for one Mini App.

## Step 2: Add the Lazy Import

Open `src/App.tsx` and add the page beside the other lazy imports:

```tsx
const EventQuizPage = lazy(
  () => import('./pages/community/mini-apps/EventQuizPage')
);
```

Lazy loading keeps code for an unopened Mini App out of the initial page bundle.

The imported module must have a default export, as shown in Step 1.

## Step 3: Register the Protected Route

In `src/App.tsx`, find the existing `/community` route:

```tsx
<Route element={<MemberRoute />}>
  <Route path="/community" element={<CommunityLayout />}>
```

Add the Mini App route inside that route:

```tsx
<Route path="mini-apps/event-quiz" element={<EventQuizPage />} />
```

Do not write the child path with a leading slash. React Router combines it with `/community`, producing:

```text
/community/mini-apps/event-quiz
```

Because the route remains inside `MemberRoute`, only approved members or existing authorized staff can access it.

## Step 4: Add the Registry Definition

Open `src/config/miniApps.ts` and add one object to `MINI_APPS`:

```ts
export const MINI_APPS: readonly MiniAppDefinition[] = [
  {
    id: 'event-quiz',
    name: 'Event Quiz',
    slug: 'event-quiz',
    description: 'Answer quizzes based on Talkware community events.',
    route: '/community/mini-apps/event-quiz',
    status: 'available',
  },
];
```

The launcher automatically renders the card.

Field rules:

| Field | Rule |
| --- | --- |
| `id` | Stable unique identifier; do not change it after release without a migration plan |
| `name` | Short member-facing title |
| `slug` | Lowercase kebab-case identifier |
| `description` | One clear sentence explaining member value |
| `route` | Absolute URL beginning with `/community/mini-apps/` |
| `status` | `available`, `beta`, or `coming_soon` |

`available` and `beta` cards are clickable. A `coming_soon` card is deliberately not clickable.

## Adding a Coming-Soon Card

If you only want to announce a future Mini App, add the registry definition with:

```ts
status: 'coming_soon'
```

You do not need to create a page or route yet. The launcher will display a disabled Coming Soon card without linking to a broken page.

Before changing the status to `available` or `beta`, create and verify the page and route.

## Step 5: Organize Larger Mini Apps

Keep a very small Mini App in its page file. When it grows, organize its private implementation by feature:

```text
src/features/mini-apps/event-quiz/
├── components/
├── services.ts
├── types.ts
└── constants.ts
```

The route-level page should compose those modules instead of containing every query, component, and validation rule.

Recommended boundaries:

- `components/`: Mini App-specific visual components
- `services.ts`: reusable data-access functions
- `types.ts`: Mini App domain types
- `constants.ts`: fixed options shared by its components
- route page: loading, error handling, page composition, and navigation

Do not create a feature folder until the Mini App is large enough to benefit from it.

## Step 6: Reuse Existing Platform Services

Before creating data models, inspect the existing application for reusable systems:

- Authentication: `src/contexts/AuthContext.tsx`
- Membership protection: `src/components/MemberRoute.tsx`
- Supabase client: `src/lib/supabase.ts`
- Community types: `src/types/community.ts`
- Member profiles, events, points, staff authorization, and existing service helpers

Do not create duplicate authentication, profiles, members, events, points, or staff roles.

If the Mini App needs database changes:

1. Create an ordered migration under `supabase/migrations`.
2. Enable Row Level Security on every new public table.
3. Add ownership or participant-based policies; `to authenticated` alone is not authorization.
4. Keep security-sensitive or multi-step operations atomic in a trusted database function/RPC.
5. Revoke direct client writes when users must not control sensitive fields.
6. Update `database_schema.sql` only when required by the repository's clean-install convention.

The frontend must not be the only place enforcing prices, permissions, rewards, balances, or state transitions.

## Step 7: Add Loading, Error, and Empty States

Every Mini App that loads data should provide:

- A visible loading state
- A useful empty state
- A readable error state
- Disabled controls while an operation is running
- Success feedback after mutations
- A mobile-friendly layout

Never leave a blank screen while data is loading or when a member has no records.

## Step 8: Verify the Mini App

Run:

```bash
npm run lint
npm run build
```

Then manually check:

1. Sign in as an approved member.
2. Open `/community/mini-apps`.
3. Confirm the new card has the correct name, description, and status.
4. Open the card and confirm the route works.
5. Refresh the Mini App URL directly.
6. Check desktop and mobile navigation.
7. Sign out and confirm the protected route redirects to authentication.
8. Test loading, empty, error, and success states when applicable.

If the Mini App has database functionality, also test its RLS policies and trusted functions against unauthorized users—not only through the browser.

## Pull Request Checklist

- [ ] The Mini App has a unique kebab-case ID and slug.
- [ ] Launcher metadata exists only in `src/config/miniApps.ts`.
- [ ] The page is lazy-loaded.
- [ ] The route is nested inside the existing protected Community route.
- [ ] The registry route exactly matches the React Router URL.
- [ ] A coming-soon card does not link to an unfinished page.
- [ ] The Mini App reuses existing authentication, members, profiles, and shared services.
- [ ] No arbitrary user-provided code or bundles are executed.
- [ ] Database tables have RLS and least-privilege grants when applicable.
- [ ] Sensitive multi-step writes are atomic and server-authorized when applicable.
- [ ] Loading, error, empty, and success states are present when applicable.
- [ ] Desktop and mobile layouts work.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Common Mistakes

### The card appears, but clicking it shows a blank or missing page

The registry entry exists, but the lazy import or route is missing. Complete Steps 2 and 3.

### The URL works, but no card appears

The route exists, but the registry entry is missing. Complete Step 4.

### A coming-soon card is clickable

Use the exact status value:

```ts
status: 'coming_soon'
```

### The page asks members to sign in again

Remove the duplicate authentication wrapper. Mini Apps inherit `MemberRoute` and `AuthContext` from the Community route tree.

### The Mini App has its own member or points table

Stop and inspect the existing domain model. Extend the shared system only when necessary; do not create a second source of truth.

### The Mini App loads an uploaded JavaScript or HTML package

Do not ship this behavior. Talkware Mini Apps are reviewed source-code features deployed with the portal, not an arbitrary plugin-execution platform.
