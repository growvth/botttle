# botttle — backlog

Actionable improvements and good-to-haves. Not ordered strictly by priority.

## High leverage

- [x] Wire **users API** into the self-hosted web app: profile (e.g. name), admin **user list**, assign **client** / **role**, **disable** accounts (`GET`/`PATCH` `/api/users` exist; client calls do not).
- [x] **Change password** flow (API + UI); document or script DB-only recovery until then.
- [x] **Forgot password** / reset via email (depends on transactional email + secure tokens).
- [x] Fix **README** inconsistency: Redis is used by the email worker; align the “reserved / not wired” wording with `worker` + `REDIS_URL`.
- [ ] Add **integration tests** for high-risk paths: auth, invoice math, Lemon Squeezy webhook handling.

## Self-hosted web app — UI / UX

- [ ] **Polish and improve UI** across the app: spacing, typography, empty states, loading/error states, consistency with design tokens (`@botttle/ui`).
- [ ] **Mobile-friendly** layouts for core flows (projects, invoices, project detail).
- [x] **Notifications**: optional dedicated **notifications page** or filters (beyond the bell dropdown); align copy/links (e.g. not only “Back to dashboard”).
- [ ] Richer **empty states** and onboarding hints for admins vs clients where roles differ.

## Marketing website — UI / UX

- [ ] **Polish and improve** the marketing site (`apps/marketing`): visual hierarchy, performance, accessibility, and consistency with product branding.
- [ ] Keep marketing **feature claims** in sync with the self-hosted app and README (avoid drift).

## Good-to-haves (product)

- [ ] **Client portal**: clearer read-only affordances, optional **email digests** for activity (reuse queue + Resend patterns).
- [ ] **Invoicing**: recurring invoices, overdue reminders, partial payments / credit notes if needed.
- [ ] **Projects**: unified **activity** view (comments + relevant audit events), optional **project templates**.
- [ ] **Deeper analytics** (dashboard / reports) when core UX feels solid.

## Ops, observability, self-hosting

- [ ] **Structured logging**: request id, user id where appropriate; document log expectations.
- [x] **Health checks**: optionally verify DB (and Redis when configured).
- [ ] **Backup / restore** notes for PostgreSQL (and files if using local disk storage).

## Optional integrations (documented; verify when touched)

- [x] **Transactional email**: `REDIS_URL`, Resend, worker — ensure docs match compose and local dev.
- [ ] **S3 file storage** (`FILE_STORAGE=s3`): validate end-to-end from web upload through API.
- [x] **Lemon Squeezy**: webhook vs dynamic checkout + variant IDs — clear env matrix in docs.
- [x] **Audit**: invoice PDF view events — confirm behavior vs env.

## Codebase / maintainability

- [ ] **Shared types** between API and web (OpenAPI, codegen, or shared package) to reduce drift.
- [ ] **Rate limits**: document defaults; consider tighter limits on `/api/auth/*` if publicly exposed.
- [ ] **`packages/utils`**: replace `noop` placeholder with real shared helpers when needed, or document intent.

## Intentionally later

- [ ] Marketing-only or niche features until core account + admin + client flows are stable.
