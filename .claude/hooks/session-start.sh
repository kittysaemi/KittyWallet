#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

set -x

cd "$CLAUDE_PROJECT_DIR"

# Install all workspace dependencies
npm install

# Build shared packages (required for backend/frontend type resolution)
npm run build:packages

# Generate Prisma client
cd apps/backend
DATABASE_URL="${DATABASE_URL:-postgresql://kittywallet:kittywallet123@localhost:5432/kittywallet}" \
  npx prisma generate
