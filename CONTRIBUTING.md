# Contributing to Talkware Community

Thank you for helping build Talkware Community. This repository serves both public visitors and approved community members, so changes must preserve accessibility, privacy, and the authorization boundaries enforced by Supabase.

Start with [`README.md`](README.md) for setup and architecture. Use the documents in [`collaboration-documents/`](collaboration-documents/) when changing a specific subsystem.

## Working agreements

- Keep each pull request focused on one problem or feature.
- Prefer a small, complete change over a broad refactor mixed with product work.
- Preserve existing behavior unless the pull request explicitly changes it.
- Never commit credentials, production data, access tokens, or private member information.
- Do not add staff-only management screens here; those belong in `../talkware_admin_hub`.
- Explain decisions and tradeoffs in the pull request, especially for database, security, and cross-repository changes.

## Development workflow

1. Create a branch from the current integration branch.
2. Install dependencies with `npm ci`.
3. Configure `.env.local` as described in the README.
4. Reproduce the existing behavior before editing it.
5. Implement the smallest coherent change.
6. Run the relevant automated and manual checks.
7. Review your own diff for unrelated edits, secrets, generated files, and accidental schema drift.
8. Open a pull request with evidence that the change works.

Suggested branch names:

```text
feat/member-directory-search
fix/event-registration-state
docs/database-workflow
refactor/community-query-service
```

## Repository boundaries

| Concern | Owner |
| --- | --- |
| Public website and member workspace | This repository |
| Staff dashboard and content administration | `../talkware_admin_hub` |
| Shared data contracts, RLS, functions, and storage policies | Supabase migrations, coordinated across both repositories |
| Static UI assets | `public/` or approved public Storage paths |
| Private originals and credentials | Server-side systems only |

If a schema change affects an Admin Hub form or query, update or coordinate both repositories in the same delivery plan.

## Frontend standards

- Use TypeScript and functional React components.
- Reuse `AuthContext`, `MemberRoute`, `CommunityLayout`, and the shared Supabase client.
- Keep route-level pages responsible for orchestration; extract reusable domain logic when a page becomes difficult to scan or test.
- Prefer explicit loading, empty, error, success, and disabled states for every asynchronous flow.
- Prevent duplicate submissions while mutations are in progress.
- Preserve direct URL loading and browser navigation behavior.
- Test responsive layouts at mobile and desktop widths.
- Use semantic HTML, visible focus states, form labels, keyboard-accessible controls, and meaningful accessible names.
- Do not introduce a second design system for one feature.

Follow the existing naming rules in [`collaboration-documents/naming-conventions.md`](collaboration-documents/naming-conventions.md).

## Supabase and data-access standards

The frontend uses a publishable/anonymous key. Every client query must be safe under the intended RLS policy.

- Select only the columns a screen needs when practical.
- Check and surface Supabase errors; do not silently render failed requests as valid empty data.
- Reuse existing tables and domain concepts before creating new ones.
- Do not trust browser-provided prices, permissions, balances, ownership, or state transitions.
- Put sensitive multi-step mutations in a database function or another trusted server boundary.
- Never expose a `service_role` key, secret key, OAuth secret, or refresh token through `VITE_` variables.
- Do not use user-editable metadata for authorization decisions.

### Database changes

This project uses ordered imperative migrations. Create migration files with the CLI:

```bash
npx supabase migration new descriptive_change_name
```

For every new table in an exposed schema:

1. Enable RLS.
2. Add explicit grants for only the roles that need Data API access.
3. Add policies that enforce ownership, participation, publication, or staff authorization.
4. Add indexes for foreign keys and frequent filter/order paths.
5. Test allowed and denied operations.

For `UPDATE`, provide both `USING` and `WITH CHECK` where ownership must remain stable. Remember that an update also needs a matching select policy.

If a `SECURITY DEFINER` function is genuinely required, set a safe `search_path`, validate the caller inside the function, revoke execution from `PUBLIC`, and grant it only to the intended role.

Validate migration replay locally:

```bash
npx supabase db reset
npx supabase test db
```

Before applying changes remotely:

```bash
npx supabase migration list
npx supabase db push --dry-run
```

Never reset a linked production database.

## Testing expectations

Minimum checks for every pull request:

```bash
npm run lint
npm run build
```

Add or update tests when behavior changes. Place frontend tests beside the code as `*.test.ts` or `*.test.tsx`, or in a nearby `__tests__/` directory. Database tests live under `supabase/tests/`.

Manual verification should cover the states affected by the change:

- Signed out, applicant, approved member, and staff access where relevant
- Loading, empty, error, success, and retry behavior
- Direct route refresh and browser back/forward navigation
- Mobile and desktop layouts
- Keyboard navigation and visible focus
- Unauthorized database access for RLS-sensitive changes

If a check cannot run locally, state why and describe the substitute evidence.

## Dependency changes

- Reuse existing dependencies when they meet the requirement.
- Explain why a new runtime dependency is necessary.
- Use a pinned compatible version and commit `package-lock.json` with `package.json`.
- Review maintenance status, bundle impact, license, and security posture.
- Do not add a dependency only to avoid a small, clear local implementation.

## Pull requests

A pull request should include:

- A concise problem statement and solution summary
- The user-visible behavior before and after
- Testing commands and results
- Screenshots or recordings for UI changes at relevant viewport sizes
- Migration, RLS, storage, environment, and deployment notes
- Cross-repository impact on the Admin Hub
- Known limitations or follow-up work

### Review checklist

- [ ] Scope is focused and unrelated changes are excluded.
- [ ] Types and component boundaries remain clear.
- [ ] Async states and error handling are present.
- [ ] Accessibility and responsive behavior were checked.
- [ ] No credentials or private data are included.
- [ ] RLS and grants match the intended access model.
- [ ] Sensitive writes are enforced outside the browser.
- [ ] Migrations replay from a clean local database when applicable.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Documentation reflects any changed contract or workflow.

## Documentation maintenance

Update the relevant collaboration document in the same pull request when changing routes, table contracts, privileged functions, naming rules, Mini App conventions, or the Admin Hub integration. Documentation is part of the implementation, not a later cleanup task.
