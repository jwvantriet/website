import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

/** Share card for every page that has no image of its own (1200×630). */
export const DEFAULT_OG_IMAGE = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
  alt: 'Confair Group — certified crew for aviation, maritime and offshore energy',
};

/**
 * Page metadata with the three things every indexable page needs and most
 * pages were missing until 2026-11-08: a canonical URL, Open Graph tags and a
 * share image.
 *
 * Next.js merges metadata per KEY, so a page that sets `openGraph` replaces the
 * layout's whole `openGraph` object — image included. That is why the image is
 * set here, per page, rather than once in the layout.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  /** Path of the page, e.g. `/vacancies`. Becomes the canonical URL. */
  path: string;
  /** Overrides the default share image (e.g. a blog post's cover). */
  image?: string | null;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  /** Full `<title>` text, bypassing the layout's " | Confair Group" template. */
  absoluteTitle?: boolean;
}): Metadata {
  const images = input.image ? [{ url: input.image }] : [DEFAULT_OG_IMAGE];
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      siteName: 'Confair Group',
      type: input.ogType ?? 'website',
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: images.map((i) => i.url),
    },
  };
}
