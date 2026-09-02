# Talkware Community

Talkware Community is the public website and member workspace for a builder community based in Mandalay. It combines community storytelling, event discovery, membership onboarding, member networking, attendance rewards, and small collaboration tools in one application.

The application is intentionally split into two independently deployed products:

- This repository contains the public website and approved-member experience.
- The sibling [`talkware_admin_hub`](../talkware_admin_hub) repository contains staff operations and content management.

Both applications use the same Supabase project. The Admin Hub writes and manages community data; this application reads public content and exposes member actions according to Row Level Security (RLS) policies.

## Product capabilities

### Public experience

- Community mission, story, contributors, and archived event highlights
- Public profiles for members who explicitly opt in
- Shareable event pages with media, structured content, and guest registration
- Google OAuth and verified email/password registration
- Membership application and application-status workflow

### Member workspace

- Upcoming community events, registration status, waitlists, and resources
- Community announcements with member reactions
- Editable member profile and public-contact preferences
- Personal QR attendance pass
- Attendance-based point history
- Mini Apps, including point-backed Peer Session requests

### Media workflow

- Optimized WebP images served from the public Supabase `assets` bucket
- Private event resources delivered through short-lived signed URLs
- Optional archival of original member images to a private Google Drive folder through the `archive-image` Edge Function

## Architecture

```text
Browser
  └─ React + React Router + Vite
       ├─ Public pages
       ├─ Auth and membership workflow
       └─ Protected member workspace
            └─ Supabase client
                 ├─ Auth
                 ├─ PostgreSQL / PostgREST
                 ├─ Storage
                 └─ Edge Functions
                      └─ Google Drive archive (optional)

Talkware Admin Hub
  └─ Same Supabase project, staff-authorized writes
```

Authorization is enforced in the database. Client-side route protection improves navigation, but it is not treated as a security boundary.

## Technology

| Area | Technology |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite 6 |
| Routing | React Router 7 |
| Animation | Motion |
| Backend | Supabase PostgreSQL, Auth, Storage, Edge Functions |
| Icons and QR | Lucide React, QRCode React |
| Hosting | Static SPA hosting; Vercel rewrite configuration is included |

## Repository layout

```text
src/
  components/              Shared UI, route guards, member layout
  config/                  Feature definitions such as Mini Apps
  contexts/                Authentication and membership state
  lib/                     Supabase client and shared utilities
  pages/                   Public and account pages
  pages/community/         Protected community features
  pages/member/            Member-specific account features
  types/                   Shared application types
supabase/
  functions/archive-image/ Google Drive archival Edge Function
  migrations/              Ordered, authoritative schema changes
  tests/                   Database behavior and RLS tests
  config.toml              Local Supabase configuration
collaboration-documents/   Architecture and cross-repository notes
database_schema.sql        Consolidated schema reference
```

## Access model

| Actor | Access |
| --- | --- |
| Visitor | Published public content, public member cards, guest event registration |
| Signed-in applicant | Own profile, application, and application status |
| Approved member | Community workspace, registrations, resources, posts, reactions, points, QR pass, and Mini Apps |
| Organizer or admin | Staff capabilities authorized through `staff_roles` and operated from the Admin Hub |

Important security rules:

- Every browser query uses a publishable/anonymous Supabase key and remains subject to RLS.
- Never expose a Supabase secret or `service_role` key through a `VITE_` variable.
- Authentication alone does not grant staff access; a matching `staff_roles` row is required.
- Public profile visibility is opt-in through `member_profiles.public_listing`.
- Privileged database functions validate the caller and explicitly restrict execution permissions.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Community landing page |
| `/event/:id` | Public | Event detail and registration |
| `/auth` | Public | Sign in, registration, and password recovery |
| `/auth/callback` | Public | OAuth and email confirmation callback |
| `/reset-password` | Public | Password update flow |
| `/join` | Signed in | Membership application |
| `/application-status` | Signed in | Application status |
| `/community` | Approved member | Member dashboard |
| `/community/events` | Approved member | Events and registrations |
| `/community/updates` | Approved member | Community posts and reactions |
| `/community/mini-apps` | Approved member | Mini App directory |
| `/community/mini-apps/peer-session` | Approved member | Peer Session discovery and requests |
| `/community/profile` | Approved member | Profile, public listing, QR pass, and account settings |
| `/member/points` | Approved member | Point balance and ledger |

## Prerequisites

- Node.js 20 LTS or newer
- npm
- Supabase CLI for local backend development
- Access to a Supabase project for hosted development or deployment

## Local development

### 1. Install dependencies

Use `npm ci` for a reproducible install from the committed lockfile:

```bash
npm ci
```

### 2. Configure the frontend environment

Create `.env.local` in the repository root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

The anon/publishable key is intended for browser use. Data exposure is controlled by grants and RLS policies, not by hiding this key.

### 3. Start Supabase locally (recommended)

```bash
npx supabase start
npx supabase db reset
```

`db reset` rebuilds the local database from the ordered files in `supabase/migrations/` and then runs `supabase/seed.sql`. Use the local API URL and anon key printed by `npx supabase status` in `.env.local`.

For an existing hosted project, link the repository and review the pending migrations before pushing:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Do not run `database_schema.sql` against an existing deployment. It is a consolidated reference for understanding the schema; incremental environments must use the migration history.

### 4. Configure authentication

Enable email/password authentication and, if required, Google OAuth in Supabase. Add the local and production callback URLs to the Auth redirect allow-list:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
https://YOUR_PRODUCTION_DOMAIN/auth/callback
https://YOUR_PRODUCTION_DOMAIN/reset-password
```

Set the production Site URL to the deployed application origin. Public email registration also requires a custom SMTP provider and verified sender; Supabase's default sender is intended for limited testing.

Local confirmation messages are captured by Mailpit when the local Supabase stack is running:

```text
http://127.0.0.1:55324
```

### 5. Start the frontend

```bash
npm run dev
```

The application runs at `http://localhost:3000` by default.

## Database workflow

This repository uses imperative, ordered SQL migrations. Treat `supabase/migrations/` as the source of truth for schema evolution.

When changing the database:

1. Create a migration with a descriptive name.
2. Make the smallest compatible schema change.
3. Enable RLS on every table exposed through the Data API.
4. Add explicit grants and policies for the intended roles.
5. Test locally with `npx supabase db reset`.
6. Run the SQL tests and review Supabase security/performance advisors.
7. Document any environment or rollout dependency in the pull request.

Database tests:

```bash
npx supabase test db
```

The latest feature migrations include member operations, event resources, profile contacts, Google Drive media archival, event highlights, attendance points, and Peer Sessions.

## Google Drive image archive

Google Drive archival is optional. The web-ready image remains in Supabase Storage even if archival is unavailable.

1. Enable the Google Drive API in a Google Cloud project.
2. Create an OAuth 2.0 client and obtain offline access with the `https://www.googleapis.com/auth/drive.file` scope.
3. Create a private Drive folder for original images.
4. Copy `supabase/functions/.env.example` to `supabase/functions/.env.local` and provide:

```env
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
```

5. Configure secrets and deploy the function:

```bash
npx supabase secrets set --env-file supabase/functions/.env.local
npx supabase functions deploy archive-image
```

Google credentials are server-side secrets. Never place them in `.env.local` at the repository root with a `VITE_` prefix.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port 3000 and expose it to the local network |
| `npm run lint` | Run TypeScript checks without emitting files |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run clean` | Remove generated `dist/` output |

## Quality checks

Run these before opening a pull request:

```bash
npm run lint
npm run build
```

For changes involving SQL, RLS, authentication, or storage, also run the local database tests. UI changes should include screenshots at mobile and desktop widths.

## Deployment

The frontend is a single-page application. `vercel.json` rewrites all routes to `index.html`, allowing React Router URLs to load directly.

Production deployment requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Auth Site URL and redirect allow-list entries for the production domain
- Applied database migrations
- Deployed `archive-image` function and Google secrets if Drive archival is enabled

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Admin Hub integration

Content and member operations belong in [`../talkware_admin_hub`](../talkware_admin_hub). Do not add staff-only management screens to this bundle.

The repositories coordinate through shared contracts:

- Database tables, functions, grants, and RLS policies
- Storage bucket names and object-path conventions
- Publication and membership status values
- Shared Supabase Auth users and `staff_roles`

Schema changes that affect both applications must be reviewed against both codebases before deployment.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before making changes. Keep pull requests focused, identify database and environment changes explicitly, and include verification notes.

## License

MIT
