#!/bin/sh
set -e

echo "Running Prisma migrations..."
cd /app/apps/api && npx prisma migrate deploy

echo "Starting application..."
exec node /app/apps/api/dist/src/main.js
