# Talkware Community Landing

A modern public landing page for the Talkware Community, a home for tech builders in Mandalay. The administration app now lives in the separate sibling project `../talkware_admin_hub`.

## Features

- Public landing page with mission, past events, team, and opt-in community member profiles
- Google OAuth or verified email/password registration, followed by a member application and admin approval
- Protected member portal for event announcements, registrations, resources, update reactions, profiles, attendance points, and personal QR passes
- Public shareable event pages with guest registration
- Supabase PostgreSQL, Auth, private/public Storage, transactional registration, and row-level security

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | React 19, Vite 6, TypeScript |
| Styling | Tailwind CSS 4, Motion |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Backend | Supabase |

## Requirements

- Node.js 18 or newer
- npm
- Supabase project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up Supabase

For a clean project, run `database_schema.sql` in the Supabase SQL Editor. Existing deployments should apply the ordered files in `supabase/migrations` instead.

Enable email/password signups with email confirmation in Supabase Auth. Enable the Google provider and configure its Google client ID/secret if you also want Google sign-in. Add these Auth redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
https://YOUR_PRODUCTION_DOMAIN/auth/callback
https://YOUR_PRODUCTION_DOMAIN/reset-password
```

For hosted/public registration, configure **Authentication → SMTP Settings** with a custom SMTP provider and a verified sender domain. Supabase's default sender is limited to organization team addresses and is not suitable for community signups. Also verify **Authentication → URL Configuration** has the production Site URL and callback URL. For local development, confirmation messages do not reach a real inbox; open Mailpit at `http://127.0.0.1:55324` after `npx supabase start`.

The member migration promotes Auth users that existed before the migration to `admin`. New email/password and Google users receive no staff access and must submit the same member-facing application.

## Development

Start the local dev server:

```bash
npm run dev
```

Local URLs:

- Public site: `http://localhost:3000/`
- Member sign in or email registration: `http://localhost:3000/auth`
- Member portal: `http://localhost:3000/community`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Build the production app |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run TypeScript checks |
| `npm run clean` | Remove `dist` |

## Production Build

```bash
npm run build
```

The build output is generated in `dist/` and can be deployed to static hosting providers such as Netlify, Vercel, or Cloudflare Pages.

## Admin Hub

Content administration is maintained and deployed independently from `../talkware_admin_hub`. Both projects connect to the same Supabase backend.

## Database

The main setup script is `database_schema.sql`. It creates tables, indexes, the public storage bucket, storage policies, and row-level security policies.

Access model:

- Public users can read published event pages, register as guests, see approved opt-in member profiles, and create a verified email/password account.
- Approved members can access community posts, event resources, their registrations, profile, reactions, attendance, and QR pass.
- Organizers and admins are authorized through `staff_roles`; authentication alone does not grant write access.
- The separate Admin Hub manages approvals, events, updates, resources, registrations, staff roles, and QR attendance.

Older local SQL helper scripts are intentionally ignored and are not part of the contributor setup path.

## Contributing

See `CONTRIBUTING.md` for the contribution workflow, coding standards, and pull request checklist.

## License

MIT
