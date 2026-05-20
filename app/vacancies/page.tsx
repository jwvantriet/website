import type { Metadata } from 'next';
import { Briefcase, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Vacancy } from '@/lib/types';
import VacancyCard from '@/components/VacancyCard';
import VacancyFilters from './VacancyFilters';

export const metadata: Metadata = {
  title: 'Open Vacancies',
  description: 'Career opportunities across aviation, maritime, and offshore energy.',
};

export const revalidate = 60;

export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: { industry?: string; q?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from('vacancies')
    .select('id, slug, carerix_id, title, industry, location, employment_type, summary, description, apply_url, is_active, posted_date, modification_date')
    .eq('is_active', true)
    .order('posted_date', { ascending: false });

  if (searchParams.industry && searchParams.industry !== 'all') {
    query = query.eq('industry', searchParams.industry);
  }
  if (searchParams.q) {
    query = query.or(
      `title.ilike.%${searchParams.q}%,location.ilike.%${searchParams.q}%,summary.ilike.%${searchParams.q}%`,
    );
  }

  const { data, error } = await query;
  const vacancies: Vacancy[] = (data as Vacancy[] | null) ?? [];
  const locations = Array.from(new Set(vacancies.map((v) => v.location).filter(Boolean))) as string[];

  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-[#fbc134] blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#407df1] blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Careers</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Open Vacancies</h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Explore career opportunities across aviation, maritime, and offshore energy. Find your
            next role with Confair.
          </p>

          {vacancies.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Briefcase className="w-4 h-4" />
                <span className="font-semibold text-white">{vacancies.length}</span> open positions
              </div>
              {locations.length > 0 && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span className="font-semibold text-white">{locations.length}</span> locations
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <VacancyFilters
            activeIndustry={searchParams.industry || 'all'}
            initialQuery={searchParams.q || ''}
          />

          {error && (
            <p className="text-center text-red-600 mb-6">
              Could not load vacancies. Please try again later.
            </p>
          )}

          {vacancies.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No vacancies found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                {searchParams.q || (searchParams.industry && searchParams.industry !== 'all')
                  ? 'No vacancies match your current filters. Try adjusting your search or industry filter.'
                  : 'There are currently no open vacancies. Please check back later.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vacancies.map((vacancy) => (
                <VacancyCard key={vacancy.id} vacancy={vacancy} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
