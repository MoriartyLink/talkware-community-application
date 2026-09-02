# Naming Conventions

Consistent names make routes, database contracts, and cross-repository changes easier to review. Match the surrounding module when an established local convention is more specific than this guide.

## Files and directories

| Kind | Convention | Example |
| --- | --- | --- |
| React component/page | PascalCase | `CommunityEventsPage.tsx` |
| Context | PascalCase with `Context` | `AuthContext.tsx` |
| Shared library | lowercase or concise camelCase | `community.ts`, `images.ts` |
| Domain type file | lowercase domain noun | `community.ts` |
| Test | source name plus `.test` | `community.test.ts` |
| Feature directory | lowercase kebab-case | `mini-apps/` |
| SQL migration name | lowercase snake_case | `add_peer_sessions` |

Generated directories such as `dist/`, `coverage/`, and `node_modules/` are not source and must not be committed.

## React and TypeScript

- Components, interfaces, and type aliases use PascalCase: `MemberProfile`, `PeerSessionRequest`.
- Hooks begin with `use`: `useAuth`.
- Variables and functions use camelCase: `selectedMemberId`, `formatEventDate`.
- State pairs use noun/setter form: `loading` / `setLoading`.
- Event callbacks use `handle` when they primarily adapt a UI event: `handleSubmit`, `handleShare`.
- Domain operations use a precise verb: `registerMember`, `cancelRegistration`, `createResourceUrl`.
- Boolean names read as predicates: `loading`, `enabled`, `isCreator`, `hasPermission`.
- Constants use uppercase snake case when module-level and immutable: `DEFAULT_TAGS`, `STATUS_STYLES`.
- Avoid vague names such as `data`, `item`, `thing`, or `handleClick` when a domain name is available.

Use `type` for unions and lightweight compositions; use `interface` for object contracts that benefit from declaration-style readability. Consistency within a module matters more than dogma.

## Components and props

- Name a component after the role it renders, not its visual shape: `EventRegistrationSection`, not `LargeCard`.
- Use `onAction` names for callback props: `onClose`, `onSaved`, `onSelect`.
- Use `is*`, `has*`, or `can*` for boolean props when the meaning is not already obvious.
- Avoid embedding route or database terminology in a generic reusable component.

## Routes

- Use lowercase kebab-case URL segments.
- Use singular resource paths for detail routes when established: `/event/:id`.
- Nest member features below `/community` unless an existing member route owns the concern.
- Nest Mini Apps below `/community/mini-apps/{slug}`.
- React Router child paths are relative and do not start with `/`.
- Route parameters use domain names such as `:id` or `:slug`, not generic `:value`.

## Database objects

| Object | Convention | Example |
| --- | --- | --- |
| Table | plural snake_case | `peer_session_requests` |
| Column | snake_case | `proposed_start_at` |
| Primary key | `id` for entity tables | `id uuid primary key` |
| User-owned key | `user_id` or role-specific ID | `requester_id` |
| Foreign key | singular relation plus `_id` | `event_id` |
| Timestamp | action plus `_at` | `published_at` |
| Boolean | predicate without `is_` when concise | `published`, `enabled` |
| Index | table/purpose plus `_idx` | `event_media_event_sort_idx` |
| Unique index | table/purpose plus `_uidx` | `point_ledger_peer_session_source_uidx` |
| Function | verb-first snake_case | `register_for_event` |
| Trigger function | describes effect | `award_event_attendance_points` |

Use constrained text values only when the allowed set is explicit and stable. Keep database values lowercase snake_case unless an established public contract already uses another form, such as `events.type` values `Meetup` and `Training`.

Policy names should describe actor, action, and scope in readable language:

```text
Members update own profile
Participants read peer session requests
Public read published events
```

## Status values

Status values are API contracts. Use exact values from the shared type/schema and do not vary capitalization in storage.

Examples:

- Application: `pending`, `approved`, `rejected`
- Registration: `confirmed`, `waitlisted`, `cancelled`
- Peer Session: `pending`, `accepted`, `declined`, `cancelled`, `completed`
- Mini App: `available`, `beta`, `coming_soon`

Display labels may be title-cased in the UI; stored values remain stable.

## Storage paths

Use deterministic, ownership-aware prefixes:

```text
member-avatars/{user_id}/{uuid}.{extension}
event-resources/{event_id}/{uuid}.{extension}
```

Do not include email addresses, display names, tokens, or other personal data in object paths. Store paths in the database and generate public or signed URLs at delivery time.

## Environment variables

- Browser-exposed Vite variables use `VITE_`: `VITE_SUPABASE_URL`.
- Server-only Edge Function secrets do not use `VITE_`: `GOOGLE_DRIVE_CLIENT_SECRET`.
- Names use uppercase snake case.
- Never use a vague shared name such as `API_KEY` when the provider can be named.

## Migration files

Create migrations through the Supabase CLI and use a concise snake_case purpose:

```bash
npx supabase migration new add_event_highlights
```

Do not manually invent timestamps. Never rename or modify an applied migration; create a forward migration.

## Cross-repository names

The public/member app and Admin Hub must use identical table names, column names, status values, bucket names, and RPC parameter names. If a rename is unavoidable, use an additive compatibility period and document the rollout in both repositories.
