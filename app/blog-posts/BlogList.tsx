'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import type { BlogPost } from '@/lib/types';
import BrandedImage from '@/components/BrandedImage';

// Fallback covers per category for posts without a cover_image_url, reusing
// the sector imagery already on the site so the grid stays on-brand.
const FALLBACK_COVERS: Record<string, string> = {
  Aviation:
    'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/29d4afd4-8a38-4bee-81b8-37dd2414c980.png',
  Maritime:
    'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png',
  Offshore:
    'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png',
  'Offshore Energy':
    'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png',
};
const DEFAULT_COVER =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/29d4afd4-8a38-4bee-81b8-37dd2414c980.png';

// Per-category colours — matched to the Vacancies page (VacancyCard /
// VacancyFilters): Aviation blue, Maritime emerald, Offshore amber.
const CATEGORY_STYLE: Record<string, { solid: string; tint: string }> = {
  Aviation: { solid: 'bg-blue-500', tint: 'bg-blue-50 text-blue-700' },
  Maritime: { solid: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-700' },
  Offshore: { solid: 'bg-amber-500', tint: 'bg-amber-50 text-amber-700' },
  'Offshore Energy': { solid: 'bg-amber-500', tint: 'bg-amber-50 text-amber-700' },
};
const DEFAULT_STYLE = { solid: 'bg-navy', tint: 'bg-gray-100 text-navy-600' };

function styleFor(category: string) {
  return CATEGORY_STYLE[category] ?? DEFAULT_STYLE;
}

function coverFor(post: BlogPost): string {
  return post.cover_image_url || FALLBACK_COVERS[post.category] || DEFAULT_COVER;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];
  const [active, setActive] = useState('All');
  const filtered = active === 'All' ? posts : posts.filter((p) => p.category === active);

  return (
    <>
      {posts.length > 1 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-2 py-4 overflow-x-auto">
              {categories.map((cat) => {
                const isActive = active === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActive(cat)}
                    aria-pressed={isActive}
                    className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? `${styleFor(cat).solid} text-white shadow-md`
                        : 'bg-gray-100 text-navy-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-20 bg-beige">
        <div className="max-w-7xl mx-auto px-6">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts in this category yet</h3>
              <p className="text-gray-500">Try another category or check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filtered.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog-posts/${post.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-56 overflow-hidden">
                    <BrandedImage
                      src={coverFor(post)}
                      alt={post.title}
                      imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styleFor(post.category).tint}`}>
                        {post.category}
                      </span>
                      {post.read_time && (
                        <span className="text-xs text-navy-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {post.read_time}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-cblue-700 transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-navy-500 text-sm leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.author && (
                          <span className="text-xs text-navy-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> {post.author}
                          </span>
                        )}
                        <span className="text-xs text-navy-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(post.published_at)}
                        </span>
                      </div>
                      <span className="text-cblue-700 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
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
