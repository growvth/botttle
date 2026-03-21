import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Container,
  Database,
  FileText,
  FolderKanban,
  Github,
  Globe,
  Key,
  Layers,
  Lock,
  Menu,
  MessageSquare,
  MoonStar,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@botttle/ui';
import logoUrl from '../../../packages/ui/public/botttle.svg';

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/docs', label: 'Docs' },
];

const steps = [
  {
    num: '01',
    title: 'Clone & configure',
    description: 'Clone the repo, copy the env file, and set your secrets. Two minutes to a running config.',
  },
  {
    num: '02',
    title: 'Start services',
    description: 'Run docker compose up to launch PostgreSQL, the API server, and the web UI together.',
  },
  {
    num: '03',
    title: 'Register & build',
    description: 'Create your admin account, add clients and projects, and start invoicing immediately.',
  },
];

const techStack = [
  { name: 'Fastify', desc: 'API' },
  { name: 'React', desc: 'Web UI' },
  { name: 'PostgreSQL', desc: 'Database' },
  { name: 'Prisma', desc: 'ORM' },
  { name: 'Bun', desc: 'Runtime' },
  { name: 'Docker', desc: 'Deploy' },
];

const shipList = [
  'Auth with JWT + refresh tokens',
  'Clients, projects, milestones, tasks',
  'Invoices with PDF export',
  'Lemon Squeezy webhook integration',
  'Time tracking with CSV export',
  'Dashboard charts & reports',
  'Comments & file uploads',
  'Role-based access (Admin / Client)',
];

/* ------------------------------------------------------------------ */
/*  Docs data                                                         */
/* ------------------------------------------------------------------ */

const docsSidebar = [
  { id: 'getting-started', label: 'Getting started', icon: Zap },
  { id: 'docker', label: 'Docker deployment', icon: Container },
  { id: 'configuration', label: 'Configuration', icon: Settings },
  { id: 'api-auth', label: 'Authentication', icon: Key },
  { id: 'api-clients', label: 'Clients', icon: Users },
  { id: 'api-projects', label: 'Projects', icon: FolderKanban },
  { id: 'api-milestones', label: 'Milestones & Tasks', icon: Layers },
  { id: 'api-invoices', label: 'Invoices & Payments', icon: WalletCards },
  { id: 'api-time', label: 'Time tracking', icon: Clock3 },
  { id: 'api-comments', label: 'Comments & Files', icon: MessageSquare },
  { id: 'api-reports', label: 'Reports', icon: FileText },
  { id: 'api-webhooks', label: 'Webhooks', icon: Globe },
  { id: 'database', label: 'Database schema', icon: Database },
];

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  desc: string;
  auth?: boolean;
  admin?: boolean;
  body?: string;
  response?: string;
}

interface DocsSection {
  id: string;
  title: string;
  description?: string;
  code?: string;
  codeLang?: string;
  endpoints?: Endpoint[];
  content?: string;
}

const docSections: DocsSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'Get botttle running locally in under five minutes. You need Bun (v1.1+), Node.js (v20+), and a running PostgreSQL instance.',
    code: `# 1. Clone the repository
git clone https://github.com/growvth/botttle.git && cd botttle

# 2. Install dependencies
bun install

# 3. Start PostgreSQL (via Docker)
docker compose up -d postgres

# 4. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set JWT_SECRET and REFRESH_SECRET

# 5. Run database migrations
cd packages/db
DATABASE_URL="postgresql://botttle:botttle@127.0.0.1:5432/botttle" \\
  bunx prisma migrate deploy
cd ../..

# 6. Start the dev servers
bun run dev:api    # API on http://localhost:3001
bun run dev:web    # Web UI on http://localhost:5173`,
    codeLang: 'bash',
  },
  {
    id: 'docker',
    title: 'Docker deployment',
    description: 'Deploy the full stack with a single command. Docker Compose orchestrates PostgreSQL, Redis, the API, and the web UI with health checks and persistent volumes.',
    code: `# Start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d

# Services:
#   Web UI  → http://localhost:8080
#   API     → http://localhost:3001
#   Postgres → localhost:5432
#   Redis    → localhost:6379

# Stop services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v`,
    codeLang: 'bash',
    content: `**Volumes** — Three named volumes persist data across restarts:
- \`postgres_data\` — Database files
- \`redis_data\` — Cache and session data
- \`api_uploads\` — Uploaded project files

**Custom secrets** — Set \`JWT_SECRET\` and \`REFRESH_SECRET\` environment variables before starting. The compose file reads them from your shell environment. In production, use a \`.env\` file or a secrets manager.`,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'All configuration is done through environment variables in apps/api/.env.',
    code: `# Server
PORT=3001
# HOST=127.0.0.1

# Database (PostgreSQL connection string)
DATABASE_URL="postgresql://botttle:botttle@127.0.0.1:5432/botttle"

# Auth — use long random strings (min 32 chars) in production
JWT_SECRET=your-jwt-secret-min-32-chars
REFRESH_SECRET=your-refresh-secret-min-32-chars

# Lemon Squeezy (optional)
# LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-signing-secret`,
    codeLang: 'env',
    content: `| Variable | Required | Description |
|---|---|---|
| \`PORT\` | No | API server port. Default: \`3001\` |
| \`HOST\` | No | Bind address. Default: \`127.0.0.1\` |
| \`DATABASE_URL\` | **Yes** | PostgreSQL connection string |
| \`JWT_SECRET\` | **Yes** | Signing key for access tokens (min 32 chars) |
| \`REFRESH_SECRET\` | **Yes** | Signing key for refresh tokens (min 32 chars) |
| \`LEMONSQUEEZY_WEBHOOK_SECRET\` | No | Webhook signature verification for Lemon Squeezy |

**First user** — The first account registered automatically receives the \`ADMIN\` role. Subsequent registrations default to \`CLIENT\`.

**Rate limiting** — All API routes are rate-limited to 100 requests per minute per IP.

**File uploads** — Maximum file size is 10 MB. Files are stored on disk at \`apps/api/uploads/\`.`,
  },
  {
    id: 'api-auth',
    title: 'Authentication',
    description: 'botttle uses JWT access tokens + refresh tokens. Include the access token as a Bearer token in the Authorization header. When a token expires, use the refresh endpoint to get a new pair.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        desc: 'Create a new account. First user becomes ADMIN.',
        body: `{ "email": "you@example.com", "password": "securepass", "name": "Jane" }`,
        response: `{ "token": "eyJ...", "refreshToken": "eyJ...", "user": { "id": "...", "email": "...", "role": "ADMIN" } }`,
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        desc: 'Authenticate and receive token pair.',
        body: `{ "email": "you@example.com", "password": "securepass" }`,
        response: `{ "token": "eyJ...", "refreshToken": "eyJ...", "user": { ... } }`,
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        desc: 'Exchange a valid refresh token for a new token pair.',
        body: `{ "refreshToken": "eyJ..." }`,
        response: `{ "token": "eyJ...", "refreshToken": "eyJ..." }`,
      },
    ],
    content: `**Usage pattern:**
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Access tokens are short-lived. When you receive a \`401\` response, call \`/api/auth/refresh\` with your refresh token to obtain a new pair. If the refresh also fails, redirect to login.`,
  },
  {
    id: 'api-clients',
    title: 'Clients',
    description: 'Manage client organizations. Each client can have multiple users and projects linked to them.',
    endpoints: [
      { method: 'GET', path: '/api/clients', desc: 'List all clients', auth: true },
      { method: 'GET', path: '/api/clients/:id', desc: 'Get client by ID', auth: true },
      { method: 'POST', path: '/api/clients', desc: 'Create a new client', auth: true, admin: true, body: `{ "name": "Acme Corp", "email": "billing@acme.com" }` },
      { method: 'PATCH', path: '/api/clients/:id', desc: 'Update client details', auth: true, admin: true, body: `{ "name": "Acme Inc" }` },
      { method: 'DELETE', path: '/api/clients/:id', desc: 'Delete a client and all related data', auth: true, admin: true },
    ],
  },
  {
    id: 'api-projects',
    title: 'Projects',
    description: 'Projects belong to a client and contain milestones, tasks, invoices, time logs, comments, and files.',
    endpoints: [
      { method: 'GET', path: '/api/projects', desc: 'List all projects (scoped by role)', auth: true },
      { method: 'GET', path: '/api/projects/:id', desc: 'Get project details with relations', auth: true },
      { method: 'POST', path: '/api/projects', desc: 'Create a new project', auth: true, admin: true, body: `{ "title": "Website Redesign", "clientId": "cl_...", "budget": 12000, "startDate": "2026-04-01" }` },
      { method: 'PATCH', path: '/api/projects/:id', desc: 'Update project (title, status, dates, etc.)', auth: true, body: `{ "status": "ACTIVE" }` },
      { method: 'DELETE', path: '/api/projects/:id', desc: 'Delete a project (cascades)', auth: true },
    ],
    content: `**Project statuses:** \`DRAFT\` → \`ACTIVE\` → \`ON_HOLD\` | \`COMPLETED\`

The \`progress\` field is automatically computed from milestone completion percentages.`,
  },
  {
    id: 'api-milestones',
    title: 'Milestones & Tasks',
    description: 'Milestones break projects into phases. Tasks break milestones into actionable items. Completion percentages and statuses auto-update when tasks change.',
    endpoints: [
      { method: 'GET', path: '/api/projects/:projectId/milestones', desc: 'List milestones for a project', auth: true },
      { method: 'POST', path: '/api/projects/:projectId/milestones', desc: 'Create a milestone', auth: true, body: `{ "title": "Design phase", "dueDate": "2026-05-01" }` },
      { method: 'GET', path: '/api/milestones/:id', desc: 'Get milestone with tasks', auth: true },
      { method: 'PATCH', path: '/api/milestones/:id', desc: 'Update milestone', auth: true },
      { method: 'DELETE', path: '/api/milestones/:id', desc: 'Delete milestone (cascades tasks)', auth: true },
      { method: 'GET', path: '/api/projects/:projectId/milestones/:milestoneId/tasks', desc: 'List tasks in a milestone', auth: true },
      { method: 'POST', path: '/api/projects/:projectId/milestones/:milestoneId/tasks', desc: 'Create a task', auth: true, body: `{ "title": "Create wireframes", "dueDate": "2026-04-15" }` },
      { method: 'GET', path: '/api/tasks/:id', desc: 'Get task by ID', auth: true },
      { method: 'PATCH', path: '/api/tasks/:id', desc: 'Update task (title, status, etc.)', auth: true, body: `{ "status": "COMPLETED" }` },
      { method: 'DELETE', path: '/api/tasks/:id', desc: 'Delete a task', auth: true },
    ],
    content: `**Status values:** \`PENDING\` → \`IN_PROGRESS\` → \`COMPLETED\`

When a task status changes, the parent milestone's \`completionPercentage\` is recalculated automatically. If all tasks are completed, the milestone status is set to \`COMPLETED\`.`,
  },
  {
    id: 'api-invoices',
    title: 'Invoices & Payments',
    description: 'Create invoices linked to projects, add line items, generate PDFs, and record payments. Supports multi-currency and tax rates.',
    endpoints: [
      { method: 'GET', path: '/api/invoices', desc: 'List all invoices', auth: true },
      { method: 'GET', path: '/api/invoices/:id', desc: 'Get invoice with items and payments', auth: true },
      { method: 'GET', path: '/api/invoices/:id/pdf', desc: 'Download invoice as PDF', auth: true },
      { method: 'POST', path: '/api/invoices', desc: 'Create an invoice', auth: true, admin: true, body: `{
  "projectId": "proj_...",
  "dueDate": "2026-04-15",
  "currency": "USD",
  "taxRate": 10,
  "items": [
    { "description": "Brand sprint", "quantity": 1, "unitPrice": 2400 },
    { "description": "Landing page", "quantity": 2, "unitPrice": 800 }
  ]
}` },
      { method: 'PATCH', path: '/api/invoices/:id/status', desc: 'Update invoice status', auth: true, body: `{ "status": "SENT" }` },
      { method: 'POST', path: '/api/invoices/:id/payments', desc: 'Record a payment', auth: true, body: `{ "amount": 2400, "paidAt": "2026-04-10T00:00:00Z" }` },
      { method: 'GET', path: '/api/projects/:projectId/invoices', desc: 'List invoices for a project', auth: true },
    ],
    content: `**Invoice statuses:** \`DRAFT\` → \`SENT\` → \`PARTIAL\` → \`PAID\` | \`OVERDUE\`

Subtotal and total are computed server-side from line items and tax rate. Once an invoice is \`PAID\`, it is locked from further edits.

**Payment statuses:** \`PENDING\` → \`COMPLETED\` | \`FAILED\``,
  },
  {
    id: 'api-time',
    title: 'Time tracking',
    description: 'Log billable and non-billable time against projects. Use the start/stop flow or create entries with explicit durations.',
    endpoints: [
      { method: 'GET', path: '/api/projects/:projectId/time-logs', desc: 'List time logs for a project', auth: true },
      { method: 'POST', path: '/api/projects/:projectId/time-logs', desc: 'Start a time log (or create with duration)', auth: true, body: `{ "description": "API integration work", "billable": true }` },
      { method: 'POST', path: '/api/time-logs/:id/stop', desc: 'Stop a running timer', auth: true },
      { method: 'DELETE', path: '/api/time-logs/:id', desc: 'Delete a time log', auth: true },
    ],
    content: `When you start a time log without specifying \`endedAt\`, it begins a running timer. Call the stop endpoint to finalize it — the \`durationSeconds\` field is computed automatically.

Time logs can be exported as CSV via the reports endpoints.`,
  },
  {
    id: 'api-comments',
    title: 'Comments & Files',
    description: 'Add discussion threads and upload deliverables to any project.',
    endpoints: [
      { method: 'GET', path: '/api/projects/:projectId/comments', desc: 'List project comments', auth: true },
      { method: 'POST', path: '/api/projects/:projectId/comments', desc: 'Add a comment', auth: true, body: `{ "body": "Design looks great, let's proceed." }` },
      { method: 'DELETE', path: '/api/comments/:id', desc: 'Delete a comment', auth: true },
      { method: 'GET', path: '/api/projects/:projectId/files', desc: 'List project files', auth: true },
      { method: 'POST', path: '/api/projects/:projectId/files', desc: 'Upload a file (multipart/form-data)', auth: true },
      { method: 'GET', path: '/api/project-files/:id/download', desc: 'Download a file', auth: true },
      { method: 'DELETE', path: '/api/project-files/:id', desc: 'Delete a file', auth: true },
    ],
    content: `**File uploads** use \`multipart/form-data\`. Maximum file size is 10 MB. Files are stored on disk and served through the download endpoint with proper MIME types.`,
  },
  {
    id: 'api-reports',
    title: 'Reports',
    description: 'Aggregate data for dashboards and exports.',
    endpoints: [
      { method: 'GET', path: '/api/reports/summary', desc: 'Dashboard summary (project counts, revenue, hours)', auth: true },
      { method: 'GET', path: '/api/reports/time', desc: 'Time report with filters and CSV export', auth: true },
    ],
    content: `The summary endpoint returns aggregated counts and totals for the dashboard: active projects, total revenue, outstanding invoices, and billable hours. The time report supports date range filters and returns data suitable for charting or CSV export.`,
  },
  {
    id: 'api-webhooks',
    title: 'Webhooks',
    description: 'Receive payment notifications from external services.',
    endpoints: [
      { method: 'POST', path: '/api/webhooks/lemon-squeezy', desc: 'Lemon Squeezy payment webhook' },
    ],
    content: `**Lemon Squeezy integration** — When configured, botttle verifies the webhook signature using \`LEMONSQUEEZY_WEBHOOK_SECRET\` and automatically records payments against matching invoices.

To set up:
1. Add your webhook URL (\`https://your-domain.com/api/webhooks/lemon-squeezy\`) in the Lemon Squeezy dashboard
2. Copy the signing secret to your \`.env\` file
3. Restart the API server`,
  },
  {
    id: 'database',
    title: 'Database schema',
    description: 'botttle uses PostgreSQL with Prisma ORM. Below is an overview of all models and their relationships.',
    code: `// Core models and relationships

User          → has many Comments, ProjectFiles
               → belongs to Client (optional)
               → roles: ADMIN | CLIENT

Client        → has many Users, Projects

Project       → belongs to Client
               → has many Milestones, Invoices, TimeLogs, Comments, ProjectFiles
               → statuses: DRAFT | ACTIVE | ON_HOLD | COMPLETED

Milestone     → belongs to Project
               → has many Tasks
               → statuses: PENDING | IN_PROGRESS | COMPLETED
               → completionPercentage auto-computed from Tasks

Task          → belongs to Milestone
               → statuses: PENDING | IN_PROGRESS | COMPLETED

Invoice       → belongs to Project
               → has many InvoiceItems, Payments
               → statuses: DRAFT | SENT | PARTIAL | PAID | OVERDUE
               → subtotal/total computed from items + taxRate

InvoiceItem   → belongs to Invoice
               → fields: description, quantity, unitPrice, amount

Payment       → belongs to Invoice
               → statuses: PENDING | COMPLETED | FAILED

TimeLog       → belongs to Project
               → fields: startedAt, endedAt, durationSeconds, billable

Comment       → belongs to Project, User

ProjectFile   → belongs to Project
               → uploaded by User
               → fields: filename, mimeType, size, storagePath`,
    codeLang: 'prisma',
    content: `**Cascade deletes** — Deleting a Client cascades to Projects, which cascade to Milestones, Tasks, Invoices, TimeLogs, Comments, and Files. Deleting a User sets \`clientId\` to null (SetNull) but cascades to Comments and ProjectFiles.

**Migrations** — Run \`bun run db:migrate\` from the repo root to apply pending migrations.
**Client generation** — Run \`bun run db:generate\` to regenerate the Prisma client after schema changes.`,
  },
];

/* ------------------------------------------------------------------ */
/*  Syntax highlighting                                               */
/* ------------------------------------------------------------------ */

interface Token {
  text: string;
  type: 'comment' | 'string' | 'keyword' | 'command' | 'flag' | 'variable' | 'url' | 'number' | 'key' | 'punctuation' | 'plain';
}

const BASH_KEYWORDS = new Set(['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'export', 'cd', 'cp', 'rm', 'mkdir', 'echo', 'git', 'docker', 'bun', 'bunx', 'npm', 'npx']);

function tokenizeBash(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    const tokens: Token[] = [];
    if (indent) tokens.push({ text: indent, type: 'plain' });

    if (trimmed.startsWith('#')) {
      tokens.push({ text: trimmed, type: 'comment' });
      return tokens;
    }

    // Tokenize word by word, preserving spaces
    const parts = trimmed.match(/\S+|\s+/g) || [];
    let afterPrompt = false;
    let firstCmd = true;

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        tokens.push({ text: part, type: 'plain' });
        continue;
      }
      if (part === '$') {
        tokens.push({ text: part, type: 'punctuation' });
        afterPrompt = true;
        firstCmd = true;
        continue;
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        tokens.push({ text: part, type: 'url' });
      } else if (part.startsWith('"') || part.startsWith("'")) {
        tokens.push({ text: part, type: 'string' });
      } else if (part.startsWith('--') || (part.startsWith('-') && part.length > 1 && !part.startsWith('-/'))) {
        tokens.push({ text: part, type: 'flag' });
      } else if (part.includes('=') && !part.startsWith('=')) {
        const eqIdx = part.indexOf('=');
        tokens.push({ text: part.slice(0, eqIdx), type: 'variable' });
        tokens.push({ text: '=', type: 'punctuation' });
        const val = part.slice(eqIdx + 1);
        if (val) tokens.push({ text: val, type: val.startsWith('"') || val.startsWith("'") ? 'string' : 'plain' });
      } else if (BASH_KEYWORDS.has(part) || (firstCmd && afterPrompt)) {
        tokens.push({ text: part, type: 'command' });
        if (firstCmd && afterPrompt) firstCmd = false;
      } else if (part === '&&' || part === '||' || part === '|' || part === '\\') {
        tokens.push({ text: part, type: 'punctuation' });
        firstCmd = true;
      } else if (part === '✓') {
        tokens.push({ text: part, type: 'keyword' });
      } else if (/^\d+(\.\d+)?s?$/.test(part)) {
        tokens.push({ text: part, type: 'number' });
      } else {
        tokens.push({ text: part, type: 'plain' });
      }
    }
    return tokens;
  });
}

function tokenizeJson(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const tokens: Token[] = [];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '/' && line[i + 1] === '/') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }
      if (ch === '"') {
        const end = line.indexOf('"', i + 1);
        const str = end === -1 ? line.slice(i) : line.slice(i, end + 1);
        // Check if it's a key (followed by :)
        const afterStr = line.slice(end + 1).trimStart();
        if (afterStr.startsWith(':')) {
          tokens.push({ text: str, type: 'key' });
        } else {
          tokens.push({ text: str, type: 'string' });
        }
        i = end === -1 ? line.length : end + 1;
      } else if (/[{}\[\]:,]/.test(ch)) {
        tokens.push({ text: ch, type: 'punctuation' });
        i++;
      } else if (/\d/.test(ch)) {
        const match = line.slice(i).match(/^[\d.]+/);
        if (match) {
          tokens.push({ text: match[0], type: 'number' });
          i += match[0].length;
        } else {
          tokens.push({ text: ch, type: 'plain' });
          i++;
        }
      } else if (line.slice(i).startsWith('true') || line.slice(i).startsWith('false') || line.slice(i).startsWith('null')) {
        const kw = line.slice(i).startsWith('true') ? 'true' : line.slice(i).startsWith('false') ? 'false' : 'null';
        tokens.push({ text: kw, type: 'keyword' });
        i += kw.length;
      } else {
        tokens.push({ text: ch, type: 'plain' });
        i++;
      }
    }
    return tokens;
  });
}

function tokenizeEnv(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    const tokens: Token[] = [];
    if (indent) tokens.push({ text: indent, type: 'plain' });

    if (trimmed.startsWith('#')) {
      tokens.push({ text: trimmed, type: 'comment' });
      return tokens;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      tokens.push({ text: trimmed.slice(0, eqIdx), type: 'variable' });
      tokens.push({ text: '=', type: 'punctuation' });
      const val = trimmed.slice(eqIdx + 1);
      if (val.startsWith('"') || val.startsWith("'")) {
        tokens.push({ text: val, type: 'string' });
      } else {
        tokens.push({ text: val, type: 'plain' });
      }
    } else {
      tokens.push({ text: trimmed, type: 'plain' });
    }
    return tokens;
  });
}

function tokenizePrisma(code: string): Token[][] {
  const MODEL_KEYWORDS = new Set(['model', 'enum', 'generator', 'datasource', 'type']);
  const TYPE_KEYWORDS = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'BigInt', 'Decimal']);
  const STATUS_KEYWORDS = new Set(['ADMIN', 'CLIENT', 'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'PENDING', 'IN_PROGRESS', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'FAILED']);

  return code.split('\n').map((line) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    const tokens: Token[] = [];
    if (indent) tokens.push({ text: indent, type: 'plain' });

    if (trimmed.startsWith('//')) {
      tokens.push({ text: trimmed, type: 'comment' });
      return tokens;
    }

    const parts = trimmed.match(/\S+|\s+/g) || [];
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        tokens.push({ text: part, type: 'plain' });
      } else if (MODEL_KEYWORDS.has(part)) {
        tokens.push({ text: part, type: 'keyword' });
      } else if (TYPE_KEYWORDS.has(part)) {
        tokens.push({ text: part, type: 'command' });
      } else if (STATUS_KEYWORDS.has(part)) {
        tokens.push({ text: part, type: 'string' });
      } else if (part === '→') {
        tokens.push({ text: part, type: 'punctuation' });
      } else if (part.startsWith('@') || part.startsWith('@@')) {
        tokens.push({ text: part, type: 'flag' });
      } else {
        tokens.push({ text: part, type: 'plain' });
      }
    }
    return tokens;
  });
}

function highlightCode(code: string, lang?: string): Token[][] {
  switch (lang) {
    case 'bash': return tokenizeBash(code);
    case 'json': return tokenizeJson(code);
    case 'env': return tokenizeEnv(code);
    case 'prisma': return tokenizePrisma(code);
    default: return tokenizeBash(code); // default to bash-like
  }
}

function HighlightedCode({ code, lang }: { code: string; lang?: string }): JSX.Element {
  const lines = highlightCode(code, lang);
  return (
    <>
      {lines.map((tokens, i) => (
        <span key={i}>
          {tokens.map((t, j) => (
            <span key={j} className={`syn-${t.type}`}>{t.text}</span>
          ))}
          {i < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Components                                                        */
/* ------------------------------------------------------------------ */

function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
      {isDark ? <Sun size={14} /> : <MoonStar size={14} />}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  return <span className={`method-badge method-${method.toLowerCase()}`}>{method}</span>;
}

function EndpointRow({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const hasDetails = ep.body || ep.response;
  return (
    <div className={`endpoint-row ${open ? 'endpoint-open' : ''}`}>
      <button type="button" className="endpoint-summary" onClick={() => hasDetails && setOpen(!open)}>
        <div className="endpoint-left">
          <MethodBadge method={ep.method} />
          <code className="endpoint-path">{ep.path}</code>
          {ep.admin && <span className="badge-admin">Admin</span>}
        </div>
        <span className="endpoint-desc">{ep.desc}</span>
        {hasDetails && <ChevronRight size={14} className={`endpoint-chevron ${open ? 'rotated' : ''}`} />}
      </button>
      {open && hasDetails && (
        <div className="endpoint-details">
          {ep.body && (
            <div className="endpoint-detail-block">
              <span className="detail-label">Request body</span>
              <pre><HighlightedCode code={ep.body} lang="json" /></pre>
            </div>
          )}
          {ep.response && (
            <div className="endpoint-detail-block">
              <span className="detail-label">Response</span>
              <pre><HighlightedCode code={ep.response} lang="json" /></pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocsContent({ section }: { section: DocsSection }) {
  return (
    <div className="docs-section" id={section.id}>
      <h2 className="docs-section-title">{section.title}</h2>
      {section.description && <p className="docs-section-desc">{section.description}</p>}
      {section.code && (
        <div className="code-block-wrap">
          {section.codeLang && <span className="code-lang">{section.codeLang}</span>}
          <pre className="code-block"><code><HighlightedCode code={section.code} lang={section.codeLang} /></code></pre>
        </div>
      )}
      {section.content && (
        <div className="docs-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }} />
      )}
      {section.endpoints && section.endpoints.length > 0 && (
        <div className="endpoints-list">
          <h3 className="endpoints-heading">Endpoints</h3>
          {section.endpoints.map((ep) => (
            <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Minimal markdown → HTML for docs prose */
function renderMarkdown(md: string): string {
  let html = md
    // code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    // inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // tables
    .replace(/(?:^|\n)\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (_m, header: string, body: string) => {
      const ths = header.split('|').map((c: string) => c.trim()).filter(Boolean).map((c: string) => `<th>${c}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').map((c: string) => c.trim()).filter(Boolean).map((c: string) => `<td>${c}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    });
  // paragraphs — split on double newlines
  html = html.split('\n\n').map((block) => {
    if (block.startsWith('<pre') || block.startsWith('<div') || block.startsWith('<table')) return block;
    return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
  return html;
}

/* ------------------------------------------------------------------ */
/*  Pages                                                             */
/* ------------------------------------------------------------------ */

function HomePage(): JSX.Element {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <span className="pill">
              <Lock size={13} />
              Self-hosted &middot; Open architecture
            </span>
            <h1 className="hero-h1">
              <span className="sr-only">botttle — </span>The client portal<br />
              you actually own.
            </h1>
            <p className="hero-sub">
              Manage projects, send invoices, track time, and collaborate with clients
              from a single self-hosted workspace. Your server, your data.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/docs">
                Get started
                <ArrowRight size={15} />
              </a>
              <a className="btn btn-ghost" href="/features">
                See features
              </a>
            </div>

            {/* Terminal preview */}
            <div className="terminal">
              <div className="terminal-bar">
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="terminal-title">terminal</span>
              </div>
              <pre className="terminal-body"><HighlightedCode code={`$ docker compose up --build
[+] Running 4/4
 ✓ postgres   Started                 1.2s
 ✓ redis      Started                 0.8s
 ✓ api        http://localhost:3001   Ready
 ✓ web        http://localhost:8080   Ready

$`} lang="bash" />{' '}<span className="t-cursor">_</span></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack ribbon */}
      <section className="stack-ribbon">
        <div className="container">
          <div className="stack-row">
            <span className="stack-label">Built with</span>
            <div className="stack-items">
              {techStack.map((t) => (
                <span key={t.name} className="stack-chip">
                  <strong>{t.name}</strong>
                  <span>{t.desc}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What ships */}
      <section className="section ship-section">
        <div className="container">
          <div className="ship-header">
            <span className="section-eyebrow">Included</span>
            <h2 className="section-title">What ships today</h2>
            <p className="section-sub">
              Production code you can deploy today. Every feature below is live.
            </p>
          </div>
          <div className="ship-list">
            {shipList.map((item) => (
              <div key={item} className="ship-item">
                <div className="ship-check"><Check size={14} /></div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup steps */}
      <section className="section">
        <div className="container section-center">
          <span className="section-eyebrow">Setup</span>
          <h2 className="section-title">Running in three steps</h2>
          <p className="section-sub">From clone to client portal in under five minutes.</p>
          <div className="steps-grid">
            {steps.map((s) => (
              <div key={s.num} className="step-card">
                <span className="step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-panel">
            <h2>Ready to own your workflow?</h2>
            <p>
              Deploy on your own infrastructure and start managing clients in minutes.
              No per-seat pricing, no data leaving your servers.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <a className="btn btn-primary" href="/docs">
                Read the docs
                <ArrowRight size={15} />
              </a>
              <a className="btn btn-ghost" href="https://github.com/growvth/botttle" target="_blank" rel="noreferrer">
                <Github size={15} />
                View source
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Features page data                                                */
/* ------------------------------------------------------------------ */

const featureDetails = [
  {
    icon: FolderKanban,
    title: 'Project management',
    headline: 'Projects, milestones, and tasks in one workspace',
    paragraphs: [
      'Each project is scoped to a client and tracks its own milestones, tasks, comments, and file uploads. Admins create and configure projects; clients see only what belongs to them.',
      'Milestones break a project into phases with optional due dates. Tasks sit inside milestones and carry their own status (Pending, In Progress, Completed). When a task status changes, the parent milestone completion percentage is recalculated automatically. When every task in a milestone is done, the milestone closes itself.',
      'Project statuses move through Draft, Active, On Hold, and Completed. The overall progress percentage is derived from milestone completions, so the number you see always reflects real task-level work.',
    ],
    details: [
      'Automatic milestone completion from task status',
      'Project progress derived from milestones',
      'Scoped per client with role-based visibility',
      'Budget tracking with optional start and end dates',
    ],
  },
  {
    icon: WalletCards,
    title: 'Invoicing & payments',
    headline: 'Create, send, and collect — with PDF export',
    paragraphs: [
      'Invoices are linked to projects. Each invoice carries line items (description, quantity, unit price), a tax rate, and a currency. Subtotals and totals are computed server-side so the numbers are always consistent.',
      'Generate a PDF for any invoice through the API — suitable for emailing to clients or attaching to accounting tools. Invoice statuses move through Draft, Sent, Partial, Paid, and Overdue, and a paid invoice is locked from further edits.',
      'Record payments manually or let Lemon Squeezy webhooks do it automatically. Each payment tracks its own status (Pending, Completed, Failed) and references an optional external ID for reconciliation.',
    ],
    details: [
      'Multi-currency with configurable tax rates',
      'PDF generation via API endpoint',
      'Payment recording with status tracking',
      'Lemon Squeezy webhook for automatic payment capture',
    ],
  },
  {
    icon: Clock3,
    title: 'Time tracking',
    headline: 'Billable hours, CSV exports, and reporting',
    paragraphs: [
      'Start a timer against any project, add an optional description, and mark it billable or non-billable. Stop the timer when you are done — the duration is calculated automatically from start and end timestamps.',
      'Time logs feed into the reports endpoints, which aggregate billable hours and revenue across projects. Export the raw data as CSV for import into accounting or payroll systems.',
      'All time entries are visible on the project detail view, giving both admins and clients a clear record of hours spent.',
    ],
    details: [
      'Start/stop timers or manual entry',
      'Billable vs. non-billable classification',
      'CSV export for accounting',
      'Per-project time summaries in reports',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Client portal',
    headline: 'Role-based access that keeps data where it belongs',
    paragraphs: [
      'botttle has two roles: Admin and Client. The first registered user is automatically promoted to Admin. Subsequent registrations default to Client and can be linked to a client organization.',
      'Clients see only the projects and invoices that belong to their organization. They can view milestones, tasks, and comments on their projects, but they cannot create new clients, projects, or invoices. Admins have full access to everything.',
      'Authentication uses JWT access tokens paired with refresh tokens. When an access token expires, the client-side app silently refreshes it. If the refresh fails, the user is redirected to login.',
    ],
    details: [
      'Admin and Client roles with automatic first-user promotion',
      'Data scoping: clients only see their own resources',
      'JWT + refresh token authentication',
      'Transparent token refresh on the frontend',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Comments & file uploads',
    headline: 'Keep conversations and deliverables inside the project',
    paragraphs: [
      'Every project has its own comment thread. Admins and clients can post comments, keeping discussion tied to the work instead of scattered across email threads or chat apps.',
      'File uploads attach directly to a project. Upload via multipart form data (up to 10 MB per file), and download through a dedicated endpoint that serves the correct MIME type. Files are stored on disk, so backups are straightforward.',
    ],
    details: [
      'Per-project comment threads',
      'File uploads with MIME type detection',
      '10 MB file size limit, stored on disk',
      'Download endpoint with proper content headers',
    ],
  },
  {
    icon: Server,
    title: 'Self-hosted deployment',
    headline: 'One command to run the full stack on your infrastructure',
    paragraphs: [
      'botttle ships a Docker Compose file that starts PostgreSQL, Redis, the Fastify API, and the React web UI with a single command. Health checks ensure services start in the right order. Three named volumes persist database files, cache data, and uploaded files across restarts.',
      'For local development, you can run the API and web app directly with Bun while using a Dockerized PostgreSQL. The setup takes two environment variables (JWT_SECRET and REFRESH_SECRET), a database migration, and two dev server commands.',
      'There is no cloud dependency, no telemetry, and no license server. The code runs on your machine and your data stays on your disk.',
    ],
    details: [
      'Docker Compose with PostgreSQL, Redis, API, and Web UI',
      'Health checks and persistent volumes',
      'Local dev with Bun + Dockerized Postgres',
      'Zero cloud dependencies or telemetry',
    ],
  },
];

function FeaturesPage(): JSX.Element {
  return (
    <>
      <section className="features-hero">
        <div className="container">
          <h1 className="features-hero-title">Features</h1>
          <p className="features-hero-sub">
            A detailed look at every module in botttle — from project management to deployment.
          </p>
        </div>
      </section>

      <section className="features-body">
        <div className="container">
          {featureDetails.map((f, i) => (
            <article key={f.title} className="feature-detail">
              <div className="feature-detail-header">
                <div className="feature-icon-wrap">
                  <f.icon size={20} />
                </div>
                <div>
                  <span className="feature-detail-label">{f.title}</span>
                  <h2 className="feature-detail-headline">{f.headline}</h2>
                </div>
              </div>

              <div className="feature-detail-body">
                <div className="feature-detail-prose">
                  {f.paragraphs.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                <div className="feature-detail-sidebar">
                  <h3>Highlights</h3>
                  <ul>
                    {f.details.map((d) => (
                      <li key={d}>
                        <Check size={14} />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {i < featureDetails.length - 1 && <hr className="feature-divider" />}
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <div className="cta-panel">
            <h2>Ready to try it?</h2>
            <p>
              Read the docs, clone the repo, and have botttle running in five minutes.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <a className="btn btn-primary" href="/docs">
                Read the docs
                <ArrowRight size={15} />
              </a>
              <a className="btn btn-ghost" href="https://github.com/growvth/botttle" target="_blank" rel="noreferrer">
                <Github size={15} />
                View source
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DocsPage(): JSX.Element {
  const [activeId, setActiveId] = useState(docsSidebar[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    const sections = document.querySelectorAll('.docs-section');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="docs-layout">
      {/* Mobile sidebar toggle */}
      <button type="button" className="docs-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <BookOpen size={16} />
        Navigation
        <ChevronRight size={14} className={sidebarOpen ? 'rotated' : ''} />
      </button>

      <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="docs-sidebar-inner">
          <div className="sidebar-group">
            <span className="sidebar-group-label">Getting started</span>
            {docsSidebar.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${activeId === item.id ? 'active' : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-group">
            <span className="sidebar-group-label">API Reference</span>
            {docsSidebar.slice(3, 12).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${activeId === item.id ? 'active' : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-group">
            <span className="sidebar-group-label">Reference</span>
            {docsSidebar.slice(12).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${activeId === item.id ? 'active' : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="docs-content" ref={contentRef}>
        <div className="docs-hero">
          <h1 className="docs-hero-title">Documentation</h1>
          <p className="docs-hero-sub">
            Everything you need to deploy, configure, and build on botttle.
          </p>
        </div>
        {docSections.map((section) => (
          <DocsContent key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                               */
/* ------------------------------------------------------------------ */

const pageSEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'botttle — Self-Hosted Client Portal for Freelancers',
    description:
      'botttle is the open-source, self-hosted client portal for freelancers and small teams. Manage projects, send invoices, track time, and collaborate with clients from your own server.',
  },
  '/features': {
    title: 'Features — botttle | Projects, Invoicing, Time Tracking & More',
    description:
      'Explore every feature in botttle: project management with milestones, invoicing with PDF export, time tracking, client portal with role-based access, comments, file uploads, and Docker deployment.',
  },
  '/docs': {
    title: 'Documentation — botttle | Setup, API Reference & Configuration',
    description:
      'Complete botttle documentation: getting started guide, Docker deployment, environment configuration, full REST API reference for projects, invoices, time logs, and database schema.',
  },
};

function usePageSEO(path: string) {
  useEffect(() => {
    const seo = pageSEO[path] || pageSEO['/'];
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', seo.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', seo.description);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://botttle.dev${path === '/' ? '' : path}`);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', seo.title);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', seo.description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `https://botttle.dev${path === '/' ? '/' : path}`);
  }, [path]);
}

function App(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const year = new Date().getFullYear();
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const isDocsPage = path === '/docs';
  const isFeaturesPage = path === '/features';

  usePageSEO(path);

  let page = <HomePage />;
  if (isDocsPage) page = <DocsPage />;
  else if (isFeaturesPage) page = <FeaturesPage />;

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="container header-row">
          <a href="/" className="brand">
            <img src={logoUrl} alt="botttle" className="brand-logo" />
            <span>botttle</span>
          </a>
          <nav className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="header-right">
            <a className="header-icon-link" href="https://github.com/growvth/botttle" target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
              <Github size={18} />
            </a>
            <ThemeToggle />
            <button
              type="button"
              aria-label="Toggle navigation"
              className="mobile-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main>{page}</main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand-col">
              <a href="/" className="brand">
                <img src={logoUrl} alt="botttle" className="brand-logo" />
                <span>botttle</span>
              </a>
              <p>Self-hosted client portal for freelancers and small teams.</p>
            </div>
            <div className="footer-links-col">
              <div>
                <h4>Product</h4>
                <a href="/features">Features</a>
                <a href="/docs">Documentation</a>
              </div>
              <div>
                <h4>Open Source</h4>
                <a href="https://github.com/growvth/botttle" target="_blank" rel="noreferrer">GitHub</a>
                <a href="https://github.com/growvth/botttle/issues" target="_blank" rel="noreferrer">Issues</a>
              </div>
              <div>
                <h4>Stack</h4>
                <span>Fastify API</span>
                <span>React + Vite</span>
                <span>PostgreSQL + Prisma</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {year} botttle</span>
            <span className="footer-sep">&middot;</span>
            <span>Built for ownership-first teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
