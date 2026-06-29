# PharmPro Fullstack

PharmPro is a TypeScript full‑stack pharmacy management application consisting of a TypeScript Node API and a TypeScript React frontend (Vite + Tailwind). It implements core pharmacy domains (auth, patients, drugs, inventory, sales, purchases, prescriptions, reports, finance, insurance, audit) and uses Prisma for database schema management.

## Key features
- Role-based authentication and JWT sessions
- Patient records and prescriptions
- Inventory, purchasing and sales workflows
- Reporting and financial modules
- Background jobs, file uploads (S3), SMS integration, email delivery
- Prisma migrations and seed support

## Tech stack
- Languages: TypeScript (primary), small amount of CSS
- Backend: Node.js + Express (TypeScript)
- Frontend: React + Vite + Tailwind CSS
- Database ORM: Prisma (with PostgreSQL expected)
- Other notable libs: socket.io (realtime), bullmq (jobs), ioredis, pino (logging), zod (validation)

## Repository layout

app/
  api/
    .env.example        example environment variables
    package.json        backend scripts & dependencies
    tsconfig.json
    prisma/
      schema.prisma     Prisma schema (DB models)
      migrations/       Prisma migrations
      seed.ts           DB seed script (super-admin bootstrap)
    src/
      server.ts         server startup
      app.ts            app composition (routes / middleware)
      config/            configuration helpers
      middleware/        HTTP middleware
      lib/               shared utilities
      jobs/              background jobs / queue handlers
      realtime/          realtime handlers (socket.io)
      modules/           domain modules (auth, patients, drugs, inventory, sales, purchases, prescriptions, reports, finance, insurance, audit)
web/
  tailwind.config.ts
  vite.config.ts
  src/
    package.json       frontend scripts & dependencies (Vite)
    main.tsx
    App.tsx
    index.css
    api/               frontend API client wrappers
    components/        UI components
    layouts/           page/layouts
    lib/               frontend utilities
    store/             client state
docker-compose.yml     compose file to bring up services (DB, Redis, API, frontend)
docs/                  documentation

## Quickstart (recommended: Docker Compose)
1. Copy and edit environment variables:
   - Copy `app/api/.env.example` → `app/api/.env` and fill secrets (DB URL, AWS keys, email, SMS keys, JWT secrets).
2. Start services:

```bash
# from repo root
docker-compose up --build
```

This should bring up the database, redis, backend and frontend services as defined in docker-compose.yml.

## Local development (separate backend & frontend)
Backend (API)

```bash
cd app/api
npm install
# development (watch)
npm run dev

# build for production, then start
npm run build
npm start
```

Helpful Prisma commands (available in the backend package.json):

```bash
# generate Prisma client
npm run generate

# run migrations locally (interactive/dev)
npm run db:migrate

# deploy migrations (CI / production where migrations are applied non-interactively)
npm run db:deploy

# seed DB (seed script)
npm run db:seed

# open Prisma Studio
npm run db:studio

# reset DB and run seed (destructive)
npm run db:reset
```

## Frontend (Vite + React)

Exact scripts (from web/src/package.json):

```bash
# location: web/src/package.json
# install deps
cd web/src && npm install

# start dev server (Vite)
npm run dev

# build production bundle
npm run build

# preview production build
npm run preview

# typecheck only
npm run typecheck
```

## Environment variables (high level)
See `app/api/.env.example` for the full list. Important ones:
- DATABASE_URL — example: postgresql://pharmpro:secret@localhost:5432/pharmpro_db
- REDIS_URL — redis://localhost:6379
- JWT_ACCESS_SECRET, JWT_REFRESH_SECRET — secrets (minimum lengths as required)
- PORT, API_URL, CLIENT_URL
- AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
- SMTP_* for email, AT_* for Africa’s Talking SMS
- SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (used by seed script)

## Tests & linting
- Backend tests: `npm test` (uses vitest in the API workspace)
- Type check: `npm run typecheck`
- Lint: `npm run lint`

## Notes
- Prisma is used for schema and migrations. Before running the API against an empty DB, run migrations (or `prisma db push` if you prefer).
- The repo includes code for S3 uploads, SMS (Africa’s Talking), and email — supply the corresponding keys in env to enable those features.
- If you rename directories for module name fixes, ensure imports and any references (tests, seeds) are updated.

## Contributing
Open an issue for bug reports or feature requests, and submit a branch + PR for changes. If you plan to change module directory names, include a migration plan/PR that updates imports across the codebase.
