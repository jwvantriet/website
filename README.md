# Confair Group — Public Website

Next.js 14 (App Router) marketing site for confair.com, deployed on Vercel and
backed by Supabase.

## Stack

- **Framework**: Next.js 14 (App Router) — server components by default
- **Styling**: Tailwind CSS + `@tailwindcss/typography`
- **Icons**: `lucide-react`
- **Data**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Hosting**: Vercel
- **Region**: `fra1` (Frankfurt)

## Pages

| Route | Source | Data |
|---|---|---|
| `/` | `app/page.tsx` | Static content |
| `/about` | `app/about/page.tsx` | Static content |
| `/services` | `app/services/page.tsx` | Static content |
| `/team` | `app/team/page.tsx` | Reads `team_members` (falls back to hard-coded list while empty) |
| `/vacancies` | `app/vacancies/page.tsx` | Reads `vacancies` (filterable via `?industry=&q=`) |
| `/vacancies/[slug]` | `app/vacancies/[slug]/page.tsx` | Reads `vacancies` by slug |
| `/blog-posts` | `app/blog-posts/page.tsx` | Reads `blog_posts` |
| `/blog-posts/[slug]` | `app/blog-posts/[slug]/page.tsx` | Reads `blog_posts` by slug |
| `/contact` | `app/contact/page.tsx` | Submits to `contact_submissions` via a Next.js server action |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Static content |
| `/terms-of-use` | `app/terms-of-use/page.tsx` | Static content |

## Supabase project

- **Name**: `Confair_Website`
- **Project ID**: `sntcxllhlwnxxbrzcuxb`
- **Region**: `eu-west-1`
- **URL**: `https://sntcxllhlwnxxbrzcuxb.supabase.co`

Tables (see `supabase/migrations/`):

| Table | Access |
|---|---|
| `vacancies` | Public `SELECT` where `is_active = true` |
| `blog_posts` | Public `SELECT` where `published = true` |
| `team_members` | Public `SELECT` where `is_active = true` |
| `contact_submissions` | Public `INSERT` only — anon cannot read |

All tables have RLS enabled.

## Local development

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# (defaults in .env.example are the live Confair_Website project — safe to use)

# 3. Run
npm run dev
```

The site is served at <http://localhost:3000>.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for first-time Vercel setup.

After the initial setup, deployments are automatic: every push to `main` triggers
a production deploy; every push to any other branch (or pull request) creates a
preview deploy with its own URL.

## Where Carerix vacancies come from

This site **does not** call Carerix directly. The `confair-api` service (Express
on Railway) owns the Carerix integration. Its job is to mirror open vacancies
into `Confair_Website.vacancies` on a schedule. Until that sync is wired up the
vacancies table will be empty and `/vacancies` will show the empty-state.

## Legacy folders

`frontend/` and `backend/` contain the original MGX Atoms export. They are kept
for reference (mock data, design decisions, the Python sync logic), are excluded
from the Vercel build, and will be removed once the migration is complete.
