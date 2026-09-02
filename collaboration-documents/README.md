# Collaboration Documents

These documents capture the engineering contracts that are easy to lose when work spans the public application, member workspace, Supabase backend, and separate Admin Hub.

They complement the root [`README.md`](../README.md) and [`CONTRIBUTING.md`](../CONTRIBUTING.md):

| Document | Use it when |
| --- | --- |
| [`current-modules.md`](current-modules.md) | Locating feature ownership, routes, or runtime boundaries |
| [`abstract-functions.md`](abstract-functions.md) | Finding important orchestration, data, and mutation responsibilities |
| [`database-schema.md`](database-schema.md) | Changing tables, RLS, RPCs, storage, or migrations |
| [`admin-hub-to-landing-page.md`](admin-hub-to-landing-page.md) | Coordinating shared contracts with `talkware_admin_hub` |
| [`mini-apps-guide.md`](mini-apps-guide.md) | Adding or extending a protected Mini App |
| [`naming-conventions.md`](naming-conventions.md) | Naming files, routes, types, database objects, and migrations |

## Maintenance rule

Update the relevant document in the same pull request as a contract change. Examples include:

- Adding or moving a route
- Introducing a table, RPC, policy, bucket, or Edge Function
- Changing publication, membership, registration, or point semantics
- Moving ownership between this repository and the Admin Hub
- Adding a Mini App or changing its registration pattern

Documents should describe current behavior and durable constraints. Avoid copying implementation line by line; link to the source module and explain why the boundary exists.

## Source-of-truth order

When documentation and implementation disagree, resolve the discrepancy using this order:

1. Applied database migrations and reviewed RLS policies for backend behavior
2. Current application source for runtime behavior
3. Automated tests for expected behavior
4. These collaboration documents

Then update the stale documentation before merging.
