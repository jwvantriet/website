# Blog drafts — SEO launch content

Three client-facing articles targeting the search terms Confair's prospects
actually use. Each file has an HTML comment header with the intended slug,
title, excerpt, category and read time; the body is written in the plain
format `app/blog-posts/[slug]/page.tsx` renders (paragraphs separated by
blank lines, `**Heading**` lines become section headings).

## Publishing flow

1. Review the drafts — especially any factual/regulatory claims — and edit
   freely.
2. Insert each into the `blog_posts` table (Confair_Website Supabase project)
   with `published = true` and `published_at` set.
3. Flip the switch: remove the `Disallow: /blog-posts` line in
   `public/robots.txt` and add published posts to `app/sitemap.ts` (query
   `blog_posts` the same way the sitemap already queries `vacancies`).
4. Promote each article on LinkedIn with a UTM-tagged link
   (`?utm_source=linkedin&utm_medium=social&utm_campaign=<slug>`).

Delete a draft from this directory once it is live in Supabase — the DB is
the source of truth, this folder is only a review staging area.
