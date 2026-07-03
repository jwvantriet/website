import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { BlogPost } from '@/lib/types';
import JsonLd from '@/components/JsonLd';
import BrandedImage from '@/components/BrandedImage';
import { articleSchema } from '@/lib/structured-data';

export const revalidate = 300;

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

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, content, category, author, cover_image_url, read_time, published, published_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  return (data as BlogPost | null) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return { title: 'Post not found' };
  // Full Open Graph + Twitter card metadata so shares (LinkedIn in
  // particular) render the article title, excerpt and cover image instead
  // of falling back to the site-wide defaults.
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: {
      card: post.cover_image_url ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

function renderContent(content: string) {
  return content.split('\n\n').map((paragraph, i) => {
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <h3 key={i} className="text-xl font-bold text-navy mt-8 mb-4">
          {paragraph.replace(/\*\*/g, '')}
        </h3>
      );
    }
    if (paragraph.includes('**') && !paragraph.startsWith('1.') && !paragraph.startsWith('- ')) {
      const parts = paragraph.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-navy-500 leading-relaxed mb-4">
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="text-navy">{part.replace(/\*\*/g, '')}</strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      );
    }
    if (paragraph.startsWith('1.') || paragraph.startsWith('- ')) {
      const items = paragraph.split('\n');
      return (
        <ul key={i} className="space-y-2 mb-6 ml-4">
          {items.map((item, j) => {
            const text = item.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '');
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={j} className="text-navy-500 leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow mt-2.5 shrink-0" />
                <span>
                  {parts.map((part, k) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={k} className="text-navy">{part.replace(/\*\*/g, '')}</strong>
                    ) : (
                      <span key={k}>{part}</span>
                    ),
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    return (
      <p key={i} className="text-navy-500 leading-relaxed mb-4">{paragraph}</p>
    );
  });
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={articleSchema(post)} />
      <section className="bg-navy py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <Link
              href="/blog-posts"
              className="inline-flex items-center gap-2 text-white/60 hover:text-yellow text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>
          </div>
          <div className="mb-4">
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-cblue/20 text-lblue">
              {post.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
            {post.author && (
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {post.author}</span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(post.published_at)}</span>
            )}
            {post.read_time && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.read_time}</span>
            )}
          </div>
        </div>
      </section>

      {post.cover_image_url && (
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <BrandedImage
              src={post.cover_image_url}
              alt={post.title}
              imgClassName="w-full h-72 md:h-96 object-cover"
            />
          </div>
        </div>
      )}

      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none">{renderContent(post.content)}</div>
        </div>
      </section>
    </>
  );
}
