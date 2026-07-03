import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

/**
 * Dynamic sitemap: static marketing routes plus every active vacancy.
 *
 * Blog posts are deliberately excluded while robots.txt still disallows
 * /blog-posts — listing URLs we simultaneously block from crawling earns
 * Search Console warnings. When the blog opens up, remove the Disallow line
 * in public/robots.txt and add a blog_posts query here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/services`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/vacancies`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms-of-use`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  let vacancyRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('vacancies')
      .select('slug, modification_date, posted_date')
      .eq('is_active', true);
    vacancyRoutes = (data ?? []).map((v) => ({
      url: `${SITE_URL}/vacancies/${v.slug}`,
      lastModified: v.modification_date ?? v.posted_date ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Supabase unavailable (e.g. build-time without env) — ship statics only.
  }

  return [...staticRoutes, ...vacancyRoutes];
}
