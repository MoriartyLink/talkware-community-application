# Talkware Community Landing

A modern public landing page for the Talkware Community, a home for tech builders in Mandalay. The administration app now lives in the separate sibling project `../talkware_admin_hub`.

## Features

- Public landing page with hero, events, highlights, founding members, volunteers, and contact sections
- Event detail pages for public event information
- Supabase PostgreSQL, Storage, and row-level security

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

Run the SQL in `database_schema.sql` from the Supabase SQL Editor.

## Development

Start the local dev server:

```bash
npm run dev
```

Local URLs:

- Public site: `http://localhost:3000/`

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

- Public users can read published content.
- Authenticated admin users can create, update, and delete content through the separate Admin Hub.

Older local SQL helper scripts are intentionally ignored and are not part of the contributor setup path.

## Contributing

See `CONTRIBUTING.md` for the contribution workflow, coding standards, and pull request checklist.

## License

MIT
