#!/bin/sh
# Build script for Render deployment

set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Building server ==="
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outfile=server_dist/index.cjs

echo "=== Pushing database schema ==="
# Use external URL for build-time DB access (internal URL only works at runtime)
if [ -n "$DATABASE_EXTERNAL_URL" ]; then
  echo "Using DATABASE_EXTERNAL_URL for drizzle-kit push"
  DATABASE_URL="$DATABASE_EXTERNAL_URL" npx drizzle-kit push
else
  echo "Using DATABASE_URL for drizzle-kit push"
  npx drizzle-kit push
fi

echo "=== Build complete ==="
