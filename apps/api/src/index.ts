import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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

// Default to SQLite for local dev so register/login work without setting up Postgres
const defaultDbDir = path.resolve(process.cwd(), '../../packages/db/prisma');
const defaultDbUrl = `file:${path.join(defaultDbDir, 'dev.db')}`;
const usingDefaultDb = !process.env['DATABASE_URL'];
if (usingDefaultDb) {
  process.env['DATABASE_URL'] = defaultDbUrl;
}

// Ensure SQLite DB and tables exist when using default dev DB
if (usingDefaultDb) {
  const dbPkg = path.resolve(process.cwd(), '../../packages/db');
  const r = spawnSync('bunx', ['prisma', 'migrate', 'deploy'], {
    cwd: dbPkg,
    env: { ...process.env, DATABASE_URL: defaultDbUrl },
    stdio: 'pipe',
  });
  if (r.status !== 0 && r.stderr?.length) {
    console.error('Prisma migrate deploy failed:', r.stderr.toString());
  }
}

import { buildApp } from './app.js';

const PORT = Number(process.env['PORT']) || 3001;

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
