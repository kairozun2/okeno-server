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
  export DATABASE_URL="$DATABASE_EXTERNAL_URL"
  echo "DATABASE_URL now: ${DATABASE_URL:0:40}..."
fi

echo "Running drizzle-kit push..."
echo "y" | npx drizzle-kit push --force 2>&1 || echo "drizzle-kit push (with --force) exit code: $?"
# Try without --force as fallback
echo "y" | npx drizzle-kit push 2>&1 || echo "drizzle-kit push exit code: $?"

echo "=== Build complete ==="
