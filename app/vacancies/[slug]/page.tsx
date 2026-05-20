import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Briefcase,
  Plane,
  Ship,
  Fuel,
  ChevronRight,
  Mail,
  CalendarDays,
  Timer,
  CalendarCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Vacancy } from '@/lib/types';

export const revalidate = 60;

const industryConfig = {
  Aviation: { icon: Plane, color: 'text-blue-600', tagBg: 'bg-blue-50', tagText: 'text-blue-700' },
  Maritime: { icon: Ship, color: 'text-emerald-600', tagBg: 'bg-emerald-50', tagText: 'text-emerald-700' },
  Offshore: { icon: Fuel, color: 'text-amber-600', tagBg: 'bg-amber-50', tagText: 'text-amber-700' },
} as const;

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

async function fetchVacancy(slug: string): Promise<Vacancy | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('vacancies')
    .select('id, slug, carerix_id, title, industry, location, employment_type, summary, description, apply_url, is_active, posted_date, modification_date')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return (data as Vacancy | null) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const vacancy = await fetchVacancy(params.slug);
  if (!vacancy) return { title: 'Vacancy not found' };
  return {
    title: vacancy.title,
    description: vacancy.summary ?? `${vacancy.industry} role with Confair Group.`,
  };
}

export default async function VacancyDetailPage({ params }: { params: { slug: string } }) {
  const vacancy = await fetchVacancy(params.slug);
  if (!vacancy) notFound();

  const config = industryConfig[vacancy.industry] || industryConfig.Aviation;
  const IndustryIcon = config.icon;
  const applyHref = vacancy.apply_url || `mailto:info@confair.com?subject=Application: ${encodeURIComponent(vacancy.title)}`;

  return (
    <>
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#222c4a] transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/vacancies" className="hover:text-[#222c4a] transition-colors">Vacancies</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#222c4a] font-medium truncate max-w-[300px]">{vacancy.title}</span>
          </nav>
        </div>
      </div>

      <section className="bg-gray-50 py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            href="/vacancies"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#222c4a] transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vacancies
          </Link>

          <div className="mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.tagBg} ${config.tagText}`}
              >
                <IndustryIcon className="w-3.5 h-3.5" />
                {vacancy.industry}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-[#222c4a] mb-3 leading-tight">
              {vacancy.title}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              <MetaItem icon={<Briefcase className="w-4 h-4" />} label="TYPE OF WORK" value={vacancy.employment_type || '—'} />
              <MetaItem icon={<MapPin className="w-4 h-4" />} label="LOCATION" value={vacancy.location || '—'} />
              <MetaItem icon={<CalendarDays className="w-4 h-4" />} label="POSTED" value={formatDate(vacancy.posted_date)} />
              <MetaItem icon={<Timer className="w-4 h-4" />} label="DURATION" value="To be discussed" />
              <MetaItem icon={<CalendarCheck className="w-4 h-4" />} label="INDUSTRY" value={vacancy.industry} />
            </div>

            <div className="bg-[#222c4a] rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider mb-1">
                  Take the next step
                </p>
                <p className="text-white/70 text-sm">
                  Ready to advance your career? Apply now for this opportunity.
                </p>
              </div>
              <a
                href={applyHref}
                className="flex-shrink-0 bg-[#fbc134] text-[#222c4a] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20"
              >
                Apply for this job
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {vacancy.summary && (
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  <p>{vacancy.summary}</p>
                </div>
              )}

              {vacancy.description && (
                <div>
                  <h2 className="text-xl font-bold text-[#222c4a] mb-4">Job description</h2>
                  <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                    {vacancy.description}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Quick Info
                </h4>
                <div className="space-y-3">
                  <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Type" value={vacancy.employment_type || '—'} />
                  <InfoRow icon={<IndustryIcon className="w-4 h-4" />} label="Industry" value={vacancy.industry} />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={vacancy.location || '—'} />
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="Posted" value={formatDate(vacancy.posted_date)} />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Recruitment Team
                </h4>
                <a
                  href="mailto:info@confair.com"
                  className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors"
                >
                  <Mail className="w-4 h-4 text-gray-400" />
                  info@confair.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5 text-sm font-medium text-[#222c4a]">
        <span className="text-gray-400">{icon}</span>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-700">{value}</p>
      </div>
    </div>
  );
}
