import { createClient } from '@/lib/supabase/server';

/**
 * RSS 2.0 feed of published blog posts — confair.com/feed.xml.
 *
 * Primary consumer: social schedulers (Buffer/Zapier "new RSS item → create
 * LinkedIn Page post"), so publishing an article in the platform's Blog
 * Manager auto-posts it to the Confair Group page. Links carry UTM tags so
 * that traffic stays attributed in HubSpot. Also serves feed readers and
 * helps crawl discovery.
 */

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confair.com';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, category, author, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (data ?? [])
    .map((post) => {
      const link = `${SITE_URL}/blog-posts/${post.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=blog-${post.slug}`;
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : '';
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(`${SITE_URL}/blog-posts/${post.slug}`)}</guid>`,
        post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : null,
        `      <category>${escapeXml(post.category)}</category>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Confair Group — Insights</title>
    <link>${SITE_URL}/blog-posts</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Workforce insights for aviation, maritime and offshore energy — hiring trends, compliance, and market benchmarks from Confair Group.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    },
  });
}
