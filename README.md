<p align="center">
  <img src="./packages/ui/public/botttle.svg" alt="botttle logo" width="120" />
</p>

<p align="center">
  <strong>botttle</strong>
</p>

<p align="center">
  A self hosted client portal for freelancers to manage projects, clients, and payments in one place.
</p>

<p align="center">
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Built%20with-Bun-000000?logo=bun&logoColor=ffffff" alt="Bun" /></a>
  <a href="https://fastify.dev"><img src="https://img.shields.io/badge/API-Fastify-000000?logo=fastify&logoColor=ffffff" alt="Fastify API" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/App-React-20232a?logo=react&logoColor=61dafb" alt="React web app" /></a>
</p>

---

## Why botttle

Freelancers and small studios are often stuck between heavyweight agency tools and rigid SaaS billing apps. botttle gives you your own client portal that you control, with a modern UI and a focus on day to day work.

- **All your work in one place**  
  Projects, milestones, tasks, invoices, time tracking, comments, and file uploads are scoped per project and client.

- **Clear, professional invoicing**  
  Create project linked invoices with line items, tax and currency support, track payments and download polished PDFs you can send to clients.

- **Client friendly portal**  
  Invite clients to log in, see only their projects and invoices, and keep everyone aligned without endless email threads.

- **Designed for self hosting**  
  Keep your data where you want it, and customize the portal as your freelance practice grows.

## Current status

botttle is in active development. The current build includes:

- Authentication, clients, projects, milestones, and tasks
- Invoicing with payments, PDF export, and Lemon Squeezy webhook hooks (checkout custom data `invoice_id`)
- Time tracking with billable flags, per-project CSV export, and reports (`/api/reports/summary`, `/api/reports/time`)
- Dashboard charts (Recharts): workload, revenue snapshot, time split and trend
- Project comments and file uploads (local disk; API ready for S3-style storage later)
- Client portal: draft invoices hidden from clients, read-only project milestones, optional **Pay online** link via `INVOICE_PAYMENT_LINK_TEMPLATE`
- Per-project **time reports** (admin): date range, billable vs non-billable, chart, CSV export (`/projects/:id/reports`)
- Admin **audit log** (who changed what): in-app `/audit-logs`, API `GET /api/audit-logs`

## Local development

PostgreSQL is required. From the repo root:

```bash
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
# Set JWT_SECRET and REFRESH_SECRET in apps/api/.env, then:
cd packages/db && DATABASE_URL="postgresql://botttle:botttle@127.0.0.1:5432/botttle" bunx prisma migrate deploy
cd ../..
bun run dev:api   # terminal 1
bun run dev:web   # terminal 2
```

**Migrations on every environment:** run `prisma migrate deploy` against the target database whenever you deploy (new migration = required before the new code runs). The Docker API image runs this automatically via `docker/entrypoint-api.sh` before starting the server. For local API only, you can set `RUN_MIGRATIONS_ON_BOOT=true` in `apps/api/.env` so `bun run dev:api` applies pending migrations first (optional).

### Optional integrations (all API-side; no secrets in the Vite web app)

| Feature | What to configure |
|--------|-------------------|
| **Transactional email** | `REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL`. Run **`bun run dev:worker`** (or the Docker `worker` service) to process the queue. |
| **Lemon checkout links** | Webhook: `LEMONSQUEEZY_WEBHOOK_SECRET` + dashboard webhook URL. **Dynamic checkouts:** `LEMONSQUEEZY_API_KEY` + `LEMONSQUEEZY_DEFAULT_VARIANT_ID` (or per-invoice variant in the UI). |
| **S3 file uploads** | `FILE_STORAGE=s3`, `S3_BUCKET`, `AWS_REGION`, credentials. Web keeps uploading **via the API** only. |
| **Audit: PDF views** | `GET /invoices/:id/pdf` records `INVOICE_PDF_VIEWED`. |

## Docker (API + web + Postgres + Redis)

```bash
# Optional: export JWT_SECRET=... REFRESH_SECRET=... (defaults are insecure)
docker compose up --build
```

- **Web UI:** http://localhost:8080 (Nginx proxies `/api` to the API)
- **API:** http://localhost:3001
- **Postgres:** localhost `5432` (user/password/db: `botttle`)
- **Redis:** localhost `6379` (reserved for future workers; not wired in app code yet)

The API container runs **`bunx prisma migrate deploy`** in `packages/db` on startup so schema changes (including `notifications` and `audit_logs`) are applied before traffic hits the app.

Compose also defines a **`worker`** service (same API image, runs `bun apps/api/dist/worker.js`) for the email queue when `REDIS_URL` / Resend are set.

Upcoming work may add a marketing site, richer client-only UX, and deeper analytics.
