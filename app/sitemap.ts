import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

/**
 * Dynamic sitemap: static marketing routes, every active vacancy, and every
 * published blog post.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/services`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/vacancies`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/guides/2026-salary-guide`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog-posts`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms-of-use`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  let vacancyRoutes: MetadataRoute.Sitemap = [];
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    const [{ data: vacancies }, { data: posts }] = await Promise.all([
      supabase.from('vacancies').select('slug, modification_date, posted_date').eq('is_active', true),
      supabase.from('blog_posts').select('slug, published_at').eq('published', true),
    ]);
    vacancyRoutes = (vacancies ?? []).map((v) => ({
      url: `${SITE_URL}/vacancies/${v.slug}`,
      lastModified: v.modification_date ?? v.posted_date ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    blogRoutes = (posts ?? []).map((p) => ({
      url: `${SITE_URL}/blog-posts/${p.slug}`,
      lastModified: p.published_at ?? undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // Supabase unavailable (e.g. build-time without env) — ship statics only.
  }

  return [...staticRoutes, ...vacancyRoutes, ...blogRoutes];
}
