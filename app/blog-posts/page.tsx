import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { BlogPost } from '@/lib/types';
import BlogList from './BlogList';

export const metadata: Metadata = {
  title: 'Blog & Industry News',
  description: 'Insights, trends, and news from aviation, maritime, and offshore energy industries.',
};

export const revalidate = 300;

export default async function BlogListPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, content, category, author, cover_image_url, read_time, published, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  const posts: BlogPost[] = (data as BlogPost[] | null) ?? [];

  return (
    <>
      <section className="bg-navy py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-yellow text-sm font-semibold uppercase tracking-wider">Insights</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Blog &amp; Industry News</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Stay informed with the latest insights, trends, and news from aviation, maritime, and offshore energy industries.
          </p>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="py-16 md:py-20 bg-beige">
          <div className="max-w-7xl mx-auto px-6 text-center py-20">
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
            <p className="text-gray-500">Check back soon for industry insights.</p>
          </div>
        </section>
      ) : (
        <BlogList posts={posts} />
      )}
    </>
  );
}
