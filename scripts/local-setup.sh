#!/usr/bin/env bash
# One-command local setup + run for the exam portal (macOS / Linux). Safe to re-run.
#   bash scripts/local-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

command -v node >/dev/null || { echo "Node.js 20 or newer is required: https://nodejs.org"; exit 1; }

# Never point a local run at a hosted/production database.
if [ -f .env ] && grep -qi "supabase" .env; then
  echo "Your .env points at Supabase. Move it aside (mv .env .env.supabase.bak) so local setup does not touch the hosted database."
  exit 1
fi

# 1. Local Postgres (Docker if it is running, otherwise Homebrew)
DB_URL="postgresql://postgres:postgres@localhost:5432/exam_platform"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  say "Starting Postgres with Docker"
  docker compose up -d db
  until docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
elif command -v brew >/dev/null 2>&1; then
  say "Starting Postgres with Homebrew"
  brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
  brew services start postgresql@16 >/dev/null
  export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
  until pg_isready -q; do sleep 1; done
  createdb exam_platform 2>/dev/null || true
  DB_URL="postgresql://$(whoami)@localhost:5432/exam_platform"
else
  echo "Postgres is needed: start Docker Desktop, or install Homebrew (https://brew.sh), then run this again."
  exit 1
fi

# 2. .env for local development (Firebase left empty = plain local accounts, no email verification)
if [ ! -f .env ]; then
  say "Creating .env"
  cat > .env <<ENVFILE
DATABASE_URL="$DB_URL"
DIRECT_URL="$DB_URL"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="$(openssl rand -hex 16)"
ADMIN_REGISTRATION_CODE="local-admin-code"
SEED_PASSWORD="Passw0rd!local1"
FIREBASE_API_KEY=""
ENVFILE
else
  echo ".env already exists, keeping it."
fi

# 3. Packages, database, demo data
say "Installing packages (first run takes a few minutes)"
npm install
./scripts/fetch-mediapipe.sh || echo "(could not fetch face model now; run scripts/fetch-mediapipe.sh later)"
say "Applying database migrations"
npx prisma migrate deploy
say "Seeding demo data"
npx prisma db seed

say "Starting the app"
cat <<INFO

  Open http://localhost:3000

  Student:  student@example.com          password: Passw0rd!local1   (college code DEMO-001)
  Admin:    admin@example.com            password: Passw0rd!local1
  College admin: college.admin@example.com  (same password)
  Registering a new admin needs the code: local-admin-code

  Stop the app with Ctrl+C.
INFO
npm run dev
