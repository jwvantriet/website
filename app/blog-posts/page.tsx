import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { BlogPost } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Blog & Industry News',
  description: 'Insights, trends, and news from aviation, maritime, and offshore energy industries.',
};

export const revalidate = 300;

const AVIATION_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/29d4afd4-8a38-4bee-81b8-37dd2414c980.png';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function BlogListPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, content, category, author, cover_image_url, read_time, published, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  const posts: BlogPost[] = (data as BlogPost[] | null) ?? [];
  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];

  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Insights</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Blog &amp; Industry News</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Stay informed with the latest insights, trends, and news from aviation, maritime, and offshore energy industries.
          </p>
        </div>
      </section>

      {posts.length > 1 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-2 py-4 overflow-x-auto">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gray-100 text-[#5a6275]"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-20 bg-[#f2eee7]">
        <div className="max-w-7xl mx-auto px-6">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
              <p className="text-gray-500">Check back soon for industry insights.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog-posts/${post.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-56 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover_image_url || AVIATION_IMG}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#407df1]/10 text-[#407df1]">
                        {post.category}
                      </span>
                      {post.read_time && (
                        <span className="text-xs text-[#5a6275] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {post.read_time}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#222c4a] mb-3 group-hover:text-[#407df1] transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-[#5a6275] text-sm leading-relaxed mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.author && (
                          <span className="text-xs text-[#5a6275] flex items-center gap-1">
                            <User className="w-3 h-3" /> {post.author}
                          </span>
                        )}
                        <span className="text-xs text-[#5a6275] flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(post.published_at)}
                        </span>
                      </div>
                      <span className="text-[#407df1] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
