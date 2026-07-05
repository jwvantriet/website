---
name: seo
description: >-
  SEO conventions for the Confair marketing site. Use whenever adding or
  renaming a page/route, writing metadata or JSON-LD, touching the sitemap,
  robots.txt, or working on rankings/rich-results/Search Console. Encodes how
  this repo does titles/descriptions, canonical + OG, schema.org via
  lib/structured-data.ts, sitemap upkeep, internal linking, and measurement.
---

# SEO on the Confair website

SEO is a feature here (see CLAUDE.md). Every new or renamed page must keep the
metadata, structured data, sitemap and internal linking correct. Follow this
checklist — it mirrors what the vertical landing pages (`app/industries/[slug]`)
already do.

## 1. Metadata — every route

Export `metadata` (static) or `generateMetadata` (dynamic) from the page:

```tsx
export const metadata: Metadata = {
  title: 'Concise, keyword-first title',        // ~50–60 chars; the root layout
                                                 // appends " | Confair Group"
  description: 'Compelling summary, ~150–160 chars, with the primary keyword.',
  alternates: { canonical: '/the/path' },        // always set a canonical
  openGraph: { title, description, type: 'website', url: '/the/path' },
};
```

- The root `layout.tsx` sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`, the
  title `template`, and Search Console `verification` — don't duplicate those.
- Dynamic routes: use `generateMetadata({ params })` and pull copy from the
  content source (e.g. `lib/verticals.ts`), never hard-code per-slug strings in
  the component.

## 2. Structured data (JSON-LD) — use the builders

All schema lives in `lib/structured-data.ts` and renders via `<JsonLd data=…/>`.
Reuse the builders; add a new one there rather than inlining schema:

- `organizationSchema()` — site-wide `EmploymentAgency`; already in `layout.tsx`
  (do not add it again per page).
- `jobPostingSchema(vacancy)` — on vacancy pages (Google for Jobs).
- `articleSchema(post)` — on blog posts.
- `serviceSchema` + `faqSchema` + `breadcrumbSchema` — on landing pages.

Any page with a real FAQ section should emit `faqSchema(...)` (eligible for the
FAQ rich result / "People Also Ask"). Any page more than one level deep should
emit `breadcrumbSchema(...)`.

## 3. Sitemap + robots

- Add every new **static** route to `app/sitemap.ts` (dynamic vacancy/blog
  routes are already generated from Supabase). Give landing/commercial pages a
  higher `priority` than legal pages.
- Don't `Disallow` a page in `public/robots.txt` that you want indexed. Today
  only `/team` and `/p/` are blocked.

## 4. Internal linking

A new page must be reachable: link it from the relevant nav (`components/Header`),
`components/Footer`, and any logical parent/related page. Orphan pages don't rank.

## 5. Images

Use `next/image` with a descriptive `alt`; set `priority` only on the LCP
(hero) image. Never ship a raw `<img>` with an eslint-disable for a content
image.

## 6. Measurement (Google Search Console)

- Verify ownership by setting `GOOGLE_SITE_VERIFICATION` (Vercel env) — the root
  metadata renders the verification tag. DNS-TXT at the registrar is the more
  durable alternative (verifies all subdomains).
- Submit `https://<site>/sitemap.xml` in GSC once verified.
- Core Web Vitals are already collected via `@vercel/speed-insights`; keep LCP
  healthy (optimize hero images, avoid layout shift).
- There is no rank-tracking tool wired in — competitor/keyword rank data needs
  an external service (Ahrefs/Semrush) or GSC's own Performance report.

## Pre-publish checklist

- [ ] `title` + `description` set, unique, keyword-first
- [ ] `alternates.canonical` set
- [ ] OG tags set
- [ ] JSON-LD emitted (Service/Article/JobPosting/FAQ/Breadcrumb as fits)
- [ ] Added to `app/sitemap.ts` (if static) and not blocked in `robots.txt`
- [ ] Linked from nav/footer/related pages
- [ ] Images via `next/image` with `alt`
- [ ] `npm run lint && npm run typecheck && npm run build` pass
