# CLAUDE.md — Dashboard New Brunswick
# dashboardnewbrunswick.xyz

> **Read this entire file before writing a single line of code.**
> This is the authoritative spec for every Claude Code session in this project.
> Do not take liberties. Do not optimize code outside your assigned task.
> If you see something that needs to change, STOP and tell me first.

---

## Project Overview

**Dashboard New Brunswick** is a public-data visualization site answering one question:
*"Is New Brunswick, NJ a good place to live?"*

The audience is anyone making a life decision — families relocating, Rutgers students picking housing, visitors deciding whether to go downtown. Design for a grandmother who has never used the internet. Clarity over cleverness, always.

- **Domain:** `dashboardnewbrunswick.xyz`
- **Tagline:** Is New Brunswick a good place to live?

---

## Current Status

> Update this section at the start and end of every session.

- [x] Repo initialized
- [x] Monorepo structure scaffolded
- [x] FE: Astro app created
- [x] BE: Express/TS API created
- [x] DB: Postgres schema created
- [x] CI/CD: GitHub Actions configured
- [x] Data: First API integrations live
- [x] Telemetry: Sentry + PostHog wired
- [x] Deploy: FE on Cloudflare Pages, BE on DigitalOcean

---

## Repository Structure

```
dashboardnewbrunswick/
├── apps/
│   ├── web/                  # Astro + React frontend (Cloudflare Pages)
│   └── api/                  # Express + TypeScript backend (DigitalOcean)
├── packages/
│   └── shared/               # Shared TypeScript types between FE and BE
├── .github/
│   └── workflows/
│       ├── deploy-web.yml
│       └── deploy-api.yml
├── CLAUDE.md                 # ← you are here
└── docker-compose.yml        # Local dev only
```

---

## Tech Stack

### Frontend — `apps/web`

| Concern | Choice | Reason |
|---|---|---|
| Framework | Astro 4 | Static-first, perfect for SEO, islands for React |
| UI Components | React 18 | Islands architecture for interactive charts |
| Styling | Tailwind CSS v3 | Utility-first, consistent design |
| Charts | Recharts | Lightweight, React-native |
| Language | TypeScript strict | No exceptions |
| Deploy | Cloudflare Pages | Free tier, global CDN, zero cold starts |
| Analytics | PostHog (cloud free tier) | A/B testing + user behavior |
| Error Tracking | Sentry (free tier) | Frontend error telemetry |

### Backend — `apps/api`

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node 20 LTS | Stable |
| Framework | Express + TypeScript | Lightweight orchestration layer |
| ORM | Drizzle ORM | SQL-first, TypeScript native, no magic |
| Caching | node-cache + DB | In-memory for hot data, DB for heavy sets |
| Deploy | DigitalOcean App Platform | Same network as DB, simple, affordable |
| Email | Resend | Already in use across Tumulty stack |
| Error Tracking | Sentry (free tier) | Backend error telemetry |

### Database

| Concern | Choice |
|---|---|
| Provider | DigitalOcean Managed Postgres |
| ORM | Drizzle ORM |
| Why | Same network as API, no cross-provider latency, SQL-first, TypeScript native |

> **Cost principle:** This site must run at near-zero cost. Every data fetch that can be cached MUST be cached. Heavy datasets get stored in Postgres. No paid APIs. No AI inference per page load.

---

## Guardrails — Read Before Every Task

1. **One feature per PR.** Never bundle unrelated changes.
2. **Minimal changes.** Only touch files directly relevant to your task.
3. **No raw SQL.** Use Drizzle query builder exclusively.
4. **TypeScript strict mode.** No `any`, no `@ts-ignore` without comment.
5. **No unauthorized refactors.** If you see tech debt, note it in a comment and tell me. Do not fix it silently.
6. **Soft deletes only.** Never hard-delete database records. Use `deletedAt` columns.
7. **Environment variables only.** No secrets in code, ever.
8. **Mobile-first.** Every component must look correct at 375px before anything else.
9. **No `console.log` in production code.** Use the logger utility.
10. **Test your types.** If a type change touches `shared/`, verify both apps compile.

---

## Data Sources — Free Public APIs

These are the APIs the backend orchestrates. All are free and require no payment.

### Tier 1 — High Priority (build first)

| Category | Source | API / URL | Cache TTL |
|---|---|---|---|
| Demographics | US Census Bureau ACS | `api.census.gov/data` | 30 days |
| Crime | FBI Crime Data Explorer | `api.usa.gov/crime/fbi/cde` | 7 days |
| Cost of Living | BLS Consumer Price Index | `api.bls.gov/publicAPI/v2` | 30 days |
| School Ratings | Urban Institute Education API | `educationdata.urban.org/api/v1` | 30 days |
| Walkability | Walk Score API | `api.walkscore.com` (free: 5k/day) | 30 days |
| Air Quality | EPA AQS API | `aqs.epa.gov/data/api` | 1 day |
| Unemployment | BLS Local Area Unemployment | `api.bls.gov/publicAPI/v2` | 7 days |

### Tier 2 — Secondary (build after Tier 1 stable)

| Category | Source | API / URL | Cache TTL |
|---|---|---|---|
| Housing Prices | HUD User API | `huduser.gov/hudapi/public` | 30 days |
| OpenStreetMap Overpass API | `overpass-api.de/api/interpreter` (no key needed) | 7 days |
| Transit | NJ Transit GTFS | Static GTFS feed (public download) | 7 days |
| Weather/Climate | Open-Meteo | `api.open-meteo.com` (no key needed) | 1 day |
| Business Activity | Census County Business Patterns | `api.census.gov/data/cbp` | 30 days |

### API Keys Required (all free tiers)

| Key | Registration URL |
|---|---|
| `CENSUS_API_KEY` | api.census.gov/key_signup.html |
| `FBI_API_KEY` | api.data.gov/signup |
| `BLS_API_KEY` | data.bls.gov/registrationEngine |
| `WALK_SCORE_API_KEY` | walkscore.com/professional/api.php |
| `HUD_API_KEY` | huduser.gov/hudapi/public/register |

---

## Database Schema (Drizzle)

```typescript
// src/db/schema.ts — Drizzle ORM

export const dataSnapshots = pgTable('data_snapshots', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  category: varchar('category').notNull(),
  source: varchar('source').notNull(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const feedbackSubmissions = pgTable('feedback_submissions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name'),
  email: varchar('email'),
  message: text('message').notNull(),
  page: varchar('page'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const blogPosts = pgTable('blog_posts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar('slug').unique().notNull(),
  title: varchar('title').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  tags: text('tags').array(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

---

## Frontend Architecture

### Pages (Astro routes)

```
src/pages/
├── index.astro          # Main dashboard — the single page experience
├── blog/
│   ├── index.astro      # Blog directory (SEO-optimized)
│   └── [slug].astro     # Individual blog post
└── feedback.astro       # Feedback form
```

### Dashboard Sections (`index.astro` — single page, anchor-scrolled)

Render in this order. Each section is a React island:

1. **`<HeroScore />`** — Top-line "livability score" (composite of all metrics, A–F letter grade). Big, simple, impossible to miss. One sentence explanation.
2. **`<SafetySection />`** — Crime stats. Violent vs property. Compared to NJ average and national average. Color-coded: green/yellow/red.
3. **`<SchoolsSection />`** — Public school ratings. Rutgers context. State ranking.
4. **`<CostSection />`** — Rent median, home price median, cost of living index vs national.
5. **`<JobsSection />`** — Unemployment rate, major employers, median income.
6. **`<NeighborhoodSection />`** — Walk score, transit score, bike score. What's nearby downtown.
7. **`<AirQualitySection />`** — EPA AQI. Simple: Good / Moderate / Poor.
8. **`<DemographicsSection />`** — Population, age, diversity breakdown. Factual, no editorializing.
9. **`<VerdictSection />`** — Three clear verdicts: "Good for families?", "Safe downtown?", "Go to Rutgers?" Each gets a score + 2-sentence plain-English explanation.
10. **`<FeedbackBanner />`** — "Did we get something wrong? Tell us."

### Design Rules

- **Font:** Inter or Geist — system-legible, no decorative fonts
- **Color system:** Green = good, Yellow = caution, Red = concerning. Apply consistently.
- **No jargon.** Every metric gets a plain-English label. "Violent Crime Rate" = "How often violent crimes happen per 1,000 people."
- **Comparison always shown.** Never show a number alone. Always: "New Brunswick: X — NJ Average: Y — National: Z"
- **Data source always attributed.** Every stat shows its source in small gray text.
- **Last updated timestamp** on every section.
- **Mobile first.** Cards stack vertically on mobile. Grid on desktop.

---

## Backend Architecture

### API Routes

```
GET  /health                 # Health check
GET  /api/dashboard          # All dashboard data in one call (main endpoint)
GET  /api/category/:name     # Individual category refresh
POST /api/feedback           # Submit feedback form
GET  /api/blog               # Blog posts list
GET  /api/blog/:slug         # Single blog post
```

### Data Orchestration Pattern

```typescript
// Every data fetcher follows this pattern
async function fetchWithCache(
  category: string,
  source: string,
  fetcher: () => Promise<any>,
  ttlDays: number
) {
  // 1. Check DB for non-expired snapshot
  // 2. If fresh: return cached data
  // 3. If stale: fetch from external API, store in DB, return fresh data
  // 4. If fetch fails: return last known good data + log error to Sentry
}
```

### `/api/dashboard` Response Shape

```typescript
interface DashboardResponse {
  generatedAt: string;
  dataFreshness: Record<string, string>; // category → ISO date of last fetch
  compositeScore: {
    letter: 'A' | 'B' | 'C' | 'D' | 'F';
    numeric: number; // 0-100
  };
  crime: CrimeData;
  schools: SchoolData;
  cost: CostData;
  jobs: JobsData;
  neighborhood: NeighborhoodData;
  airQuality: AirQualityData;
  demographics: DemographicsData;
  verdicts: {
    familyFriendly: VerdictData;
    downtownSafety: VerdictData;
    rutgers: VerdictData;
  };
}

interface VerdictData {
  score: 'good' | 'mixed' | 'poor';
  headline: string;    // e.g. "Mixed — depends on your priorities"
  explanation: string; // 2 sentences max, plain English
}
```

---

## Scoring Logic

The composite score is algorithmic, not editorial.

| Category | Weight |
|---|---|
| Violent crime rate vs NJ avg | 25% |
| School ratings | 20% |
| Cost of living affordability | 15% |
| Unemployment rate | 15% |
| Walk/transit score | 10% |
| Air quality | 10% |
| Income growth trend | 5% |

**Score → Letter:** 90–100 = A, 80–89 = B, 70–79 = C, 60–69 = D, <60 = F

---

## Telemetry & Analytics

### Error Tracking — Sentry

- Install `@sentry/astro` on FE, `@sentry/node` on BE
- Capture all unhandled exceptions
- Alert on error rate spikes
- DSN stored in environment variables

### User Analytics — PostHog

- Install `posthog-js` on FE
- Track: page views, section scroll depth, section clicks, feedback submissions
- A/B test: hero copy variants ("Is New Brunswick safe?" vs "Should you move to New Brunswick?")
- No PII captured. Anonymous session IDs only.
- PostHog free cloud tier (1M events/mo)

### Events to Track

```
dashboard_viewed
section_scrolled  { section: string }
verdict_clicked   { verdict: string }
feedback_opened
feedback_submitted
blog_post_viewed  { slug: string }
```

---

## SEO & LLM SEO

### Technical SEO

- Astro generates fully static HTML — no JS required to see content
- `<meta>` tags on every page: title, description, og:image, og:type
- `sitemap.xml` generated by `@astrojs/sitemap`
- `robots.txt` — allow all crawlers including AI bots
- Canonical URLs on all pages
- Structured data: `LocalBusiness`, `FAQPage` schema on homepage
- Page speed: target 95+ Lighthouse score

### LLM SEO (AI Crawler Optimization)

- `llms.txt` file at root (emerging standard for AI crawlers)
- Clear, factual prose on every page — AI models favor clean extractable text
- FAQ section on homepage written as Q&A pairs
- Blog posts structured as: Question → Data → Verdict → Sources
- All data attributed with source URLs so AI models can verify

### `llms.txt` Content

```
# Dashboard New Brunswick
> Data-driven answers to "Is New Brunswick, NJ a good place to live?"

This site aggregates public government data (US Census, FBI, EPA, BLS, NCES)
to help people make informed decisions about living in, visiting, or studying
in New Brunswick, New Jersey.

All data is sourced from free public APIs. No editorial opinion is expressed.
Scores are computed algorithmically from government statistics.

## Key Questions Answered
- Is New Brunswick safe?
- Is New Brunswick good for families?
- Should I send my child to Rutgers University?
- Is downtown New Brunswick worth visiting?
- What is the cost of living in New Brunswick?
```

---

## CI/CD — GitHub Actions

### FE Deploy (`deploy-web.yml`)

```
Trigger: push to main, path apps/web/**
Steps:
  1. Install deps (pnpm)
  2. Type check (tsc --noEmit)
  3. Build (astro build)
  4. Deploy to Cloudflare Pages (wrangler)
```

### BE Deploy (`deploy-api.yml`)

```
Trigger: push to main, path apps/api/**
Steps:
  1. Install deps (pnpm)
  2. Type check (tsc --noEmit)
  3. Run Drizzle migrations
  4. Deploy to DigitalOcean App Platform (doctl)
```

### Required GitHub Secrets

| Secret | Used By |
|---|---|
| `CLOUDFLARE_API_TOKEN` | FE deploy |
| `CLOUDFLARE_ACCOUNT_ID` | FE deploy |
| `DO_API_TOKEN` | BE deploy |
| `SENTRY_AUTH_TOKEN` | Both |
| `DATABASE_URL` | BE deploy |

---

## Environment Variables

### Frontend — `apps/web/.env`

```bash
PUBLIC_API_URL=https://api.dashboardnewbrunswick.xyz
PUBLIC_POSTHOG_KEY=...
PUBLIC_SENTRY_DSN=...
```

### Backend — `apps/api/.env`

```bash
DATABASE_URL=postgresql://...
CENSUS_API_KEY=...
FBI_API_KEY=...
BLS_API_KEY=...
WALK_SCORE_API_KEY=...
HUD_API_KEY=...
YELP_API_KEY=...
RESEND_API_KEY=...
FEEDBACK_EMAIL=peter@tumulty.com
SENTRY_DSN=...
PORT=3000
NODE_ENV=production
```

---

## Feedback Form

- **Fields:** Name (optional), Email (optional), Message (required), Page/Section (auto-populated)
- **On submit:** POST to `/api/feedback` → store in DB → send email via Resend to `FEEDBACK_EMAIL`
- **Email template:** Plain text, includes all submitted fields + timestamp
- **No CAPTCHA** initially — add if spam becomes a problem
- Show confirmation message, do not redirect

---

## Blog Directory

- `/blog` — list of all published posts
- Each post card: title, excerpt, date, tags, read time
- Posts stored in Astro content collections
- **Tags:** `crime`, `housing`, `schools`, `dining`, `relocation`, `rutgers`
- Every post has: title tag, meta description, og:image, canonical URL, structured data
- **Target keywords:** "Is New Brunswick NJ safe", "New Brunswick NJ schools rating", "living in New Brunswick NJ", "Rutgers housing safety", "New Brunswick NJ crime rate 2025"

---

## Local Development

```bash
# Start everything
docker-compose up -d          # Postgres locally
pnpm install                  # Install all workspace deps
pnpm --filter web dev         # Astro dev server → localhost:4321
pnpm --filter api dev         # Express dev server → localhost:3001

# Database
pnpm --filter api db:push     # Push schema changes
pnpm --filter api db:studio   # Open Drizzle Studio
```

---

## Task Sequencing — Build in This Order

> Each task = one Claude Code session = one PR.

### Phase 1 — Foundation

- [ ] **Task 1:** Initialize monorepo with pnpm workspaces, Astro app, Express app, shared types package
- [ ] **Task 2:** Drizzle schema + DigitalOcean Postgres connection + db:push
- [ ] **Task 3:** GitHub Actions CI/CD for both apps (type check + deploy)
- [ ] **Task 4:** Sentry + PostHog wired into both FE and BE

### Phase 2 — Data Layer

- [ ] **Task 5:** `fetchWithCache` utility + Census API integration (demographics)
- [ ] **Task 6:** FBI Crime Data API integration
- [x] **Task 7:** BLS unemployment + CPI integration
- [x] **Task 8:** Walk Score API integration
- [x] **Task 9:** Urban Institute Education API integration
- [x] **Task 10:** EPA Air Quality API integration
- [x] **Task 11:** `/api/dashboard` endpoint assembles all data + scoring algorithm

### Phase 3 — Frontend

- [x] **Task 12:** Homepage shell — layout, nav, section anchors, footer
- [x] **Task 13:** `<HeroScore />` and `<VerdictSection />` components
- [x] **Task 14:** `<SafetySection />` and `<SchoolsSection />` components
- [x] **Task 15:** `<CostSection />`, `<JobsSection />`, `<NeighborhoodSection />` components
- [x] **Task 16:** `<AirQualitySection />` and `<DemographicsSection />` components
- [x] **Task 17:** Feedback form + `/api/feedback` endpoint + Resend email

### Phase 4 — SEO & Polish

- [ ] **Task 18:** SEO meta tags, sitemap.xml, robots.txt, llms.txt, structured data
- [ ] **Task 19:** Blog directory page + dynamic `[slug]` page
- [ ] **Task 20:** PostHog A/B test on hero copy
- [ ] **Task 21:** Lighthouse audit + performance fixes

---

## Notes for Claude Code

- Always check `Current Status` section at top before starting
- Update `Current Status` at end of every session
- Ask before installing any new dependency not already listed in this file
- Run `tsc --noEmit` before declaring a task complete
- Run `astro check` on FE before declaring a task complete
- Commit message format: `feat(scope): description` or `fix(scope): description`
- Never commit `.env` files
- If a public API is rate-limited or down, log the error and return the last cached snapshot — never crash the dashboard
