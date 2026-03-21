import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

// Load .env from api package dir so DATABASE_URL is set when run via turbo from root
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  const t = readFileSync(envPath, 'utf8');
  for (const line of t.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    const key = m?.[1];
    const val = m?.[2];
    if (key && val !== undefined && !process.env[key]) {
      process.env[key] = val.replace(/^["']|["']$/g, '').trim();
    }
  }
}

if (!process.env['DATABASE_URL']?.trim()) {
  console.error(
    'DATABASE_URL is not set. For local dev: start Postgres (e.g. `docker compose up -d postgres`) and set DATABASE_URL in apps/api/.env (see .env.example).'
  );
  process.exit(1);
}

import { buildApp } from './app.js';

const PORT = Number(process.env['PORT']) || 3001;

function runMigrationsOnBootIfEnabled(): void {
  if (process.env['RUN_MIGRATIONS_ON_BOOT'] !== 'true') return;
  const dbDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../packages/db');
  if (!existsSync(dbDir)) {
    console.error(`RUN_MIGRATIONS_ON_BOOT: packages/db not found at ${dbDir}`);
    process.exit(1);
  }
  const r = spawnSync('bunx', ['prisma', 'migrate', 'deploy'], {
    cwd: dbDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    console.error('prisma migrate deploy failed');
    process.exit(1);
  }
}

async function main() {
  runMigrationsOnBootIfEnabled();
  const app = await buildApp();
  try {
    // On some macOS environments, Fastify can throw while enumerating interfaces
    // when binding to 0.0.0.0. Defaulting to 127.0.0.1 avoids that dev-only issue.
    const host = process.env['HOST'] || '127.0.0.1';
    await app.listen({ port: PORT, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
