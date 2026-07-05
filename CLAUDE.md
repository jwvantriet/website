# website (confair-website)

Confair Group's public marketing site: **Next.js 14 (App Router) + Tailwind 3 +
Supabase**, deployed on **Vercel** (region `fra1`, auto-deploy on push). See
`DEPLOY.md` for the Vercel setup.

## ⚠️ The live site is the Next.js app at the repo ROOT

Work happens in these root-level directories only:

- **`app/`** — App Router pages/routes (`about`, `services`, `industries`,
  `vacancies`, `apply`, `blog-posts`, `guides`, legal pages, `sitemap.ts`,
  `feed.xml`, `layout.tsx`).
- **`components/`** — shared React components (`Header`, `Footer`,
  `VacancyCard`, `JsonLd`, cookie/attribution/spam components).
- **`lib/`** — `supabase/` client, `attribution.ts`, `spam.ts`,
  `structured-data.ts`, `types.ts`.
- **`content/`** — blog drafts/content. **`supabase/migrations/`** — DB schema.
- **`public/`** — static assets, `robots.txt`.

**`frontend/` (Vite) and `backend/` (Python/FastAPI) are LEGACY and ignored by
Vercel** — do not edit them to change the live site, and don't import from them.
Ignore the stray `todo.md` / `*.pdf` / `marketing-inputs/` unless asked.

## Conventions

- **Supabase**: use the clients in `lib/supabase`. Only the **publishable**
  (`NEXT_PUBLIC_SUPABASE_*`) keys belong in the browser; Row Level Security
  governs access. Never put a service-role key in client code or commit secrets.
- **Vacancies** are read from the Supabase `vacancies` table, which
  `confair-api` syncs from Carerix — this site does not write them. Applications
  submit to Supabase (`vacancy_applications` + the `vacancy-cvs` bucket) and are
  pushed to Carerix by `confair-api`'s apply webhook.
- **SEO is a feature**: keep `sitemap.ts`, `feed.xml`, JSON-LD
  (`lib/structured-data.ts` + `JsonLd`), and OG metadata correct when adding or
  renaming pages. `NEXT_PUBLIC_SITE_URL` drives canonical/OG URLs.
- **Forms** use the spam-shield fields (`components/SpamShieldFields`,
  `lib/spam.ts`) and attribution tracking (`lib/attribution.ts`) — keep both
  wired on new forms.
- **Styling**: Tailwind 3 + `@tailwindcss/typography`. Use `lucide-react` for
  icons.

## Checks

Before pushing: `npm run lint && npm run typecheck` (must pass). Then
`npm run build` for a production sanity check. `npm run dev` for local work.
