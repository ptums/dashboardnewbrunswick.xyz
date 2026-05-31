# Dashboard New Brunswick

**Is New Brunswick, NJ a good place to live?**

An open-source dashboard that answers one question using only public government data — no opinions, no AI-generated copy, no paid APIs. Numbers from the Census Bureau, FBI, EPA, BLS, Walk Score, and more, turned into a single clear verdict.

→ **[dashboardnewbrunswick.xyz](https://dashboardnewbrunswick.xyz)**

---

## What It Shows

Each section compares New Brunswick to the NJ average and the national average:

| Section | Source |
|---|---|
| Safety — violent & property crime rates | FBI Crime Data Explorer |
| Schools — public school ratings | Urban Institute Education API |
| Cost of Living — rent, home prices, CPI | BLS + HUD |
| Jobs — unemployment rate, median income | BLS Local Area Unemployment |
| Walkability — walk, transit, bike scores | Walk Score API |
| Air Quality — EPA AQI | EPA AQS API |
| Demographics — population, age, diversity | US Census Bureau ACS |

The homepage also renders three plain-English verdicts: **Good for families? Safe downtown? Go to Rutgers?**

---

## Tech Stack

| Layer | Choice | Hosting |
|---|---|---|
| Frontend | Astro 4 + React 18 + Tailwind CSS | Cloudflare Pages |
| Backend | Express + TypeScript | DigitalOcean App Platform |
| Database | Postgres + Drizzle ORM | DigitalOcean Managed Postgres |
| Monorepo | pnpm workspaces | — |

---

## Repository Structure

```
├── apps/
│   ├── web/        # Astro frontend
│   └── api/        # Express + TypeScript API
├── packages/
│   └── shared/     # Shared TypeScript types (no runtime code)
└── docker-compose.yml
```

---

## Prerequisites

- Node 20+
- pnpm 10+
- Docker (for local Postgres)

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start local Postgres (runs on port 5433 to avoid conflicts)
docker compose up -d

# 4. Push the database schema
pnpm --filter api db:push

# 5. Start dev servers
pnpm --filter web dev   # → http://localhost:4321
pnpm --filter api dev   # → http://localhost:3001
```

---

## Environment Variables

### `apps/api/.env`

| Variable | Where to get it | Needed for |
|---|---|---|
| `DATABASE_URL` | Your Postgres connection string | Everything |
| `CENSUS_API_KEY` | [api.census.gov/key_signup.html](https://api.census.gov/key_signup.html) | Demographics |
| `FBI_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup) | Crime |
| `BLS_API_KEY` | [data.bls.gov/registrationEngine](https://data.bls.gov/registrationEngine) | Jobs, Cost of Living |
| `WALK_SCORE_API_KEY` | [walkscore.com/professional/api.php](https://www.walkscore.com/professional/api.php) | Walkability |
| `HUD_API_KEY` | [huduser.gov/hudapi/public/register](https://www.huduser.gov/hudapi/public/register) | Housing prices |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | Feedback email |
| `SENTRY_DSN` | [sentry.io](https://sentry.io) | Error tracking |

All government API keys are free. No credit card required for any of them.

### `apps/web/.env`

| Variable | Value |
|---|---|
| `PUBLIC_API_URL` | `http://localhost:3001` (local) or your deployed API URL |
| `PUBLIC_POSTHOG_KEY` | PostHog project key |
| `PUBLIC_SENTRY_DSN` | Sentry DSN |

---

## Commands

```bash
# Dev
pnpm --filter web dev           # Astro dev server
pnpm --filter api dev           # Express dev server (tsx watch)

# Type checking
pnpm typecheck                  # Both apps
pnpm typecheck:web              # Frontend only
pnpm typecheck:api              # Backend only

# Database
pnpm --filter api db:push       # Push schema changes to database
pnpm --filter api db:studio     # Open Drizzle Studio (database browser)

# Infrastructure
docker compose up -d            # Start local Postgres on port 5433
docker compose down             # Stop local Postgres
```

---

## API Routes

```
GET  /health                # Health check
GET  /api/dashboard         # All dashboard data in one response
GET  /api/category/:name    # Single category (for manual refresh)
POST /api/feedback          # Submit feedback form
GET  /api/blog              # Blog posts list
GET  /api/blog/:slug        # Single blog post
```

---

## Contributing

This project is built task-by-task — see `CLAUDE.md` for the full task sequencing. Each task is one PR with one focused change.

Current build status is tracked in the `Current Status` section of `CLAUDE.md`.
