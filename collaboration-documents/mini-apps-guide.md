# Mini App Contribution Guide

Mini Apps are reviewed, repository-owned features inside the protected Talkware member workspace. They help members learn, collaborate, or exchange community value while reusing the platform's identity, navigation, data, and security model.

Mini Apps are not uploaded websites, iframes, plugins, or arbitrary user-provided JavaScript bundles.

## Existing foundation

| Concern | Source |
| --- | --- |
| Launcher UI | `src/pages/community/MiniAppsPage.tsx` |
| Metadata registry | `src/config/miniApps.ts` |
| Protected route | `src/App.tsx` |
| Member shell | `src/components/CommunityLayout.tsx` |
| Membership guard | `src/components/MemberRoute.tsx` |
| Shared identity | `src/contexts/AuthContext.tsx` |
| Shared backend client | `src/lib/supabase.ts` |

The launcher lives at `/community/mini-apps`. Pages inherit authentication, approval checks, desktop/mobile navigation, and the application suspense boundary.

Peer Sessions is the current reference implementation. It demonstrates member discovery, availability preferences, participant-scoped records, point-ledger integration, and trusted database transitions.

## Decide whether the feature is a Mini App

A feature belongs here when it:

- Serves approved members rather than anonymous visitors
- Is shipped and reviewed with this repository
- Benefits from existing member identity or community data
- Has a focused workflow that can be represented by one launcher card

Use another model when the feature is staff administration, public content, a separately deployed product, or untrusted uploaded code.

## Add a Mini App

### 1. Define stable identity

Choose a stable ID and lowercase kebab-case slug:

```text
Name: Event Quiz
ID: event-quiz
Slug: event-quiz
Route: /community/mini-apps/event-quiz
```

Do not rename an ID after release without checking persisted data, analytics, links, and migration requirements.

### 2. Create the route page

Small pages may live under `src/pages/community/`. Larger features should use a private feature directory and keep the route page thin:

```text
src/features/mini-apps/event-quiz/
  components/
  service.ts
  types.ts
  constants.ts
src/pages/community/EventQuizPage.tsx
```

The page owns loading/error state and composition. Domain services own reusable queries and mutations. Visual components should not know about unrelated platform concerns.

### 3. Lazy-load and register the route

In `src/App.tsx`:

```tsx
const EventQuizPage = lazy(() => import('./pages/community/EventQuizPage'));
```

Add the child route inside the existing `/community` layout:

```tsx
<Route path="mini-apps/event-quiz" element={<EventQuizPage />} />
```

Use a relative child path without a leading slash. Do not add another router, auth provider, or membership guard.

### 4. Register launcher metadata

Add one definition to `src/config/miniApps.ts`:

```ts
{
  id: 'event-quiz',
  name: 'Event Quiz',
  slug: 'event-quiz',
  description: 'Answer quizzes based on Talkware community events.',
  route: '/community/mini-apps/event-quiz',
  status: 'beta',
}
```

| Field | Contract |
| --- | --- |
| `id` | Stable unique identifier |
| `name` | Concise member-facing title |
| `slug` | Kebab-case identifier |
| `description` | One sentence describing member value |
| `route` | Absolute route below `/community/mini-apps/` |
| `status` | `available`, `beta`, or `coming_soon` |

`available` and `beta` entries are linked. `coming_soon` entries are intentionally disabled and do not require a page or route yet.

## Reuse platform services

Before creating a new model, inspect the existing member profile, event, registration, post, pass, point, and staff systems. Extend the shared model when the concept is genuinely shared; do not create duplicate user, member, event, or balance tables.

Use `useAuth()` for current identity and membership context. Never accept a browser-supplied user ID as proof of ownership.

## Database-backed Mini Apps

Create an ordered migration with:

```bash
npx supabase migration new add_event_quiz
```

Design requirements:

- Enable RLS on every new exposed table.
- Add explicit Data API grants.
- Use owner-, participant-, publication-, or staff-based policies.
- Index foreign keys and frequent filter/order paths.
- Keep authoritative scoring, pricing, balances, permissions, and state transitions outside the browser.
- Use a trusted RPC for multi-step operations that must succeed atomically.
- Revoke direct writes when users must not control protected fields.
- Make retries idempotent when duplicate effects would be harmful.

For a security-definer function, validate `auth.uid()`, set a safe `search_path`, revoke execution from `PUBLIC`, and grant the intended role explicitly.

Validate locally:

```bash
npx supabase db reset
npx supabase test db
```

## UX requirements

Every data-backed Mini App must include:

- A visible initial loading state
- An actionable error state
- A meaningful empty state
- Disabled controls during mutations
- Success feedback
- Safe retry behavior
- Responsive layouts and touch targets
- Keyboard-accessible dialogs and controls
- Labels and accessible names for form elements

Destructive or costly actions should require clear confirmation and describe the effect before execution.

## Verification matrix

Automated checks:

```bash
npm run lint
npm run build
```

Manual checks:

1. Confirm the launcher metadata and status.
2. Open the route as an approved member.
3. Refresh the route directly.
4. Verify desktop sidebar and mobile navigation behavior.
5. Sign out and confirm redirect to authentication.
6. Test loading, empty, error, success, and retry states.
7. Test insufficient permissions and invalid state transitions.
8. Test concurrent or repeated submissions when the feature changes balances or rewards.

Database-backed work must test RLS and RPC behavior independently of the UI for anonymous, unrelated authenticated, participant, and staff roles as applicable.

## Pull request checklist

- [ ] The feature belongs in the Mini App model.
- [ ] ID, slug, route, and registry entry are consistent.
- [ ] The page is lazy-loaded inside the existing protected route tree.
- [ ] Existing identity and domain services are reused.
- [ ] No arbitrary uploaded code is executed.
- [ ] Async and responsive states are complete.
- [ ] Database changes include RLS, grants, indexes, and denied-case tests.
- [ ] Sensitive writes are atomic and server-authorized.
- [ ] Migration replay and frontend checks pass.
- [ ] Cross-repository or operational impacts are documented.

## Common failures

### Card exists but route fails

The registry entry, lazy import, and route are three separate pieces. Verify all three use the same slug.

### Route works but card is absent

Add the definition to `MINI_APPS`; the launcher is registry-driven.

### Coming-soon card is clickable

Use the exact `coming_soon` status and do not add an enabled route until the feature is ready.

### Page asks the member to authenticate again

Remove duplicate auth wrappers. The route already inherits `AuthProvider` and `MemberRoute`.

### Balance changes in frontend code

Move the mutation to a trusted database transaction and record the change in the shared ledger.

### User-uploaded HTML or JavaScript is executed

Do not ship this design. Mini Apps are reviewed source features, not a plugin runtime.
