# Deploying to Vercel — Step-by-Step

One-time setup. Subsequent deploys happen automatically on every push.

## 1. Connect the repository to Vercel

1. Sign in at <https://vercel.com> (use the GitHub account that owns
   `jwvantriet/website`).
2. **Add New… → Project**.
3. Pick the `jwvantriet/website` repository. Click **Import**.
4. **Project Name**: `confair-website` (or whatever you prefer — this becomes
   the default `*.vercel.app` subdomain).
5. **Framework Preset**: Next.js (auto-detected from `package.json`).
6. **Root Directory**: leave as `./` — the Next.js project lives at the repo
   root. Vercel ignores the legacy `frontend/` and `backend/` folders.
7. **Build & Output Settings**: leave at defaults (`next build`, `.next`).

## 2. Set environment variables

In the import screen (or later under **Settings → Environment Variables**),
add the following for **Production**, **Preview**, and **Development**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sntcxllhlwnxxbrzcuxb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_SfLAh8BkDnfKkQU8YP2ghQ_YhZDBCpB` |

These are the publishable keys — they are safe to expose to the browser; Row
Level Security on the database controls what they can do. The values are also
in `.env.example`.

Optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for OG tags. Set this to your custom domain once it is live (e.g. `https://confair.com`). |
| `NEXT_PUBLIC_PLATFORM_URL` | URL the "Login" button links to. Defaults to `https://platform.confair.com/login`. |

## 3. Deploy

Click **Deploy**. The first build takes ~2 minutes. Vercel returns a URL like
`https://confair-website.vercel.app`.

## 4. Add the production domain (when you're ready)

1. **Settings → Domains**.
2. Add `confair.com` (and/or `www.confair.com`).
3. Vercel shows you the DNS records to add at your registrar.
4. Once DNS propagates, Vercel provisions SSL automatically.
5. Update `NEXT_PUBLIC_SITE_URL` to the new domain.

## 5. Continuous deployment

From this point on:

- Every push to `main` → production deploy.
- Every push to any other branch, including PRs → preview deploy with its
  own URL (visible in the PR check).
- Every commit gets its own immutable URL (good for sharing work-in-progress).

## Branch protection (optional but recommended)

Once the Next.js project is on `main`, in GitHub:
**Settings → Branches → Add rule** for `main`:

- Require a pull request before merging
- Require status checks to pass (Vercel preview deploy + any future CI)

This makes preview deploys part of every change instead of a side door.

## Operating notes

- **Caching**: `/`, `/about`, `/services`, `/privacy-policy`, `/terms-of-use`
  are fully static. `/team`, `/vacancies`, `/vacancies/[slug]`,
  `/blog-posts`, `/blog-posts/[slug]` use `revalidate` (60–300 seconds) so
  Supabase content stays fresh without re-rendering on every request.
- **Contact form**: handled by a Next.js server action
  (`app/contact/actions.ts`). Submissions go straight to Supabase via the anon
  key, scoped by an `INSERT`-only RLS policy. No backend needed.
- **Logs**: Vercel dashboard → Project → Logs → Functions for server-action
  errors. Real Supabase errors also show up in the Supabase project's
  Logs tab.

## Connecting Carerix → website (next milestone)

This repo does not call Carerix. The plan is:

1. `confair-api` (Express, Railway, already in production) gains a small sync
   job: on a schedule (e.g. hourly), it reads active vacancies from Carerix
   GraphQL and upserts them into `Confair_Website.vacancies`.
2. The site picks them up automatically — it already reads from that table.
3. No changes to this repo are required to wire it up; only `confair-api` and
   a scheduled job (Railway cron, Supabase Edge Function on schedule, or
   GitHub Actions).
