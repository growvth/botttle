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

**Docs:** [Development](docs/DEVELOPMENT.md) · [API](docs/API_DOCS.md) · [Self-hosting](docs/SELF_HOSTING.md)

Upcoming work may add a marketing site, Docker compose, Redis and background jobs, richer client-only UX, and deeper analytics.
