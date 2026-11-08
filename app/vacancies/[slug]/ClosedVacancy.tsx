import Link from 'next/link';
import { ArrowRight, Briefcase } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Vacancy } from '@/lib/types';
import VacancyCard from '@/components/VacancyCard';

/** Words of a slug, without the trailing Carerix id ("tr-a320-captain-335"). */
function slugWords(slug: string): string[] {
  return decodeURIComponent(slug)
    .toLowerCase()
    .trim()
    .replace(/-\d+$/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/**
 * Shown at the URL of a vacancy that is no longer open (or never existed).
 *
 * Closed postings used to answer a bare 404, and they are some of the most
 * visited URLs on the site: /vacancies/tr-a320-captain-335 had 834 visitors in
 * the three months to 2026-11-08, arriving from Google, job boards and shared
 * links long after it closed. They now get the closest open roles instead.
 *
 * The page is noindex (see generateMetadata) and carries no JobPosting data,
 * which is what Google asks for an expired job. The inactive row itself cannot
 * be read here — RLS exposes active vacancies only — so "closest" is ranked on
 * the words of the old URL against the open vacancies' slugs.
 */
export default async function ClosedVacancy({ slug }: { slug: string }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vacancies')
    .select(
      'id, slug, carerix_id, title, industry, location, employment_type, summary, description, apply_url, is_active, posted_date, publication_start, modification_date, company_name',
    )
    .eq('is_active', true);
  const open = (data as Vacancy[] | null) ?? [];

  const wanted = new Set(slugWords(slug));
  const similar = open
    .map((v) => ({ v, score: slugWords(v.slug).filter((w) => wanted.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.v);

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-navy-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">This position has been filled</h1>
          <p className="text-navy-500 text-lg leading-relaxed">
            The vacancy you are looking for is no longer open.{' '}
            {similar.length > 0
              ? 'These open roles are the closest match.'
              : `We have ${open.length} other open ${open.length === 1 ? 'role' : 'roles'}.`}
          </p>
        </div>

        {similar.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {similar.map((v) => (
              <VacancyCard key={v.id} vacancy={v} />
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/vacancies"
            className="inline-flex items-center justify-center gap-2 bg-navy text-white px-8 py-3.5 rounded-lg font-bold hover:bg-navy-800 transition-colors"
          >
            View all open vacancies <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
