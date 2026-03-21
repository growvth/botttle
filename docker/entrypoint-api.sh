#!/usr/bin/env sh
set -e
cd /app/packages/db
bunx prisma migrate deploy
cd /app/apps/api
exec bun dist/index.js
