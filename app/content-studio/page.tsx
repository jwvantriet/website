import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { BlogPost, Vacancy } from '@/lib/types';
import ShareCard from './ShareCard';

/**
 * Internal content studio — the LinkedIn push desk.
 *
 * Lists every published blog post (and live vacancies) with a pre-written
 * LinkedIn caption and a UTM-tagged link. "Copy caption" + "Share on
 * LinkedIn" opens LinkedIn's composer with the article attached; switch the
 * posting identity to the Confair Group page, paste, publish. Thirty seconds
 * per post, attribution intact.
 *
 * Same access model as /image-library: not linked, not in the sitemap,
 * noindexed — a team tool reachable only by URL.
 */

export const metadata: Metadata = {
  title: 'Content Studio (internal)',
  robots: { index: false, follow: false },
};

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

function blogCaption(post: BlogPost, link: string): string {
  return [
    post.title,
    '',
    post.excerpt ?? '',
    '',
    `Read it here 👇`,
    link,
    '',
    '#aviation #maritime #offshoreenergy #recruitment',
  ].join('\n');
}

function vacancyCaption(v: Vacancy, link: string): string {
  const emoji = v.industry === 'Aviation' ? '✈️' : v.industry === 'Maritime' ? '⚓' : '🌊';
  return [
    `${emoji} We're hiring: ${v.title}${v.location ? ` — ${v.location}` : ''}.`,
    '',
    v.summary ?? 'Compliance, payroll and cross-border deployment handled end to end by Confair.',
    '',
    `Details + apply: ${link}`,
    '',
    'Know someone who fits? Tag them. 👇',
  ].join('\n');
}

export default async function ContentStudioPage() {
  const supabase = createClient();
  const [{ data: posts }, { data: vacancies }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, category, author, cover_image_url, read_time, published, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false }),
    supabase
      .from('vacancies')
      .select('id, slug, title, industry, location, summary')
      .eq('is_active', true)
      .order('posted_date', { ascending: false }),
  ]);

  const blogItems = ((posts as BlogPost[] | null) ?? []).map((p) => {
    const link = `${SITE_URL}/blog-posts/${p.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=blog-${p.slug}`;
    return {
      id: `blog-${p.id}`,
      title: p.title,
      meta: [p.category, p.read_time, p.published_at?.slice(0, 10)].filter(Boolean).join(' · '),
      caption: blogCaption(p, link),
      shareUrl: link,
    };
  });

  const vacancyItems = ((vacancies as Vacancy[] | null) ?? []).map((v) => {
    const link = `${SITE_URL}/vacancies/${v.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=vacancy-spotlight`;
    return {
      id: `vac-${v.id}`,
      title: v.title,
      meta: [v.industry, v.location].filter(Boolean).join(' · '),
      caption: vacancyCaption(v, link),
      shareUrl: link,
    };
  });

  return (
    <section className="py-16 bg-beige min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-10">
          <span className="text-cblue text-sm font-semibold uppercase tracking-wider">Internal</span>
          <h1 className="text-3xl font-bold text-navy mt-2 mb-3 flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-cblue" /> Content Studio
          </h1>
          <p className="text-navy-500 max-w-3xl leading-relaxed">
            Push site content to LinkedIn in three clicks: copy the caption, hit share, and in
            LinkedIn&rsquo;s composer switch the posting identity to the Confair Group page before
            publishing. Every link carries UTM tags, so results show up attributed in HubSpot.
          </p>
        </div>

        <h2 className="text-xl font-bold text-navy mb-5">Blog articles ({blogItems.length})</h2>
        <div className="space-y-5 mb-14">
          {blogItems.map(({ id, ...item }) => (
            <ShareCard key={id} {...item} />
          ))}
        </div>

        <h2 className="text-xl font-bold text-navy mb-2">Vacancy spotlights ({vacancyItems.length})</h2>
        <p className="text-navy-500 text-sm mb-5">
          Rotate one per week — pick whichever role most needs candidates right now.
        </p>
        <div className="space-y-5">
          {vacancyItems.map(({ id, ...item }) => (
            <ShareCard key={id} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
