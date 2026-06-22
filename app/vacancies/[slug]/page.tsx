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
  Clock,
  Building2,
  ChevronRight,
  Timer,
  CalendarDays,
  CalendarCheck,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Vacancy } from '@/lib/types';
import ApplyButton from './ApplyButton';

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
    .select(
      'id, slug, carerix_id, title, industry, location, employment_type, summary, description, ' +
        'apply_url, is_active, posted_date, modification_date, ' +
        'intro_html, vacancy_html, requirements_html, offer_html, company_html, contact_html, ' +
        'reference_number, publication_start, publication_end, company_name, ' +
        'consultant_name, consultant_title, consultant_phone, consultant_email, consultant_photo',
    )
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

  // Display dates: posted is shown as a fixed standard (1 Jan 2026); "updated"
  // is always recent — the visit date minus 14 days.
  const postedDisplay  = formatDate('2026-01-01');
  const updatedDisplay = formatDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  return (
    <>
      {/* Breadcrumb */}
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

          {/* Header */}
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

            {vacancy.reference_number && (
              <p className="text-sm text-gray-400 mb-6">Ref#: {vacancy.reference_number}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              <MetaItem icon={<Briefcase className="w-4 h-4" />} label="TYPE OF WORK" value={vacancy.employment_type || '—'} />
              <MetaItem icon={<MapPin className="w-4 h-4" />} label="LOCATION" value={vacancy.location || '—'} />
              <MetaItem icon={<CalendarDays className="w-4 h-4" />} label="UPDATED" value={updatedDisplay} />
              <MetaItem icon={<Timer className="w-4 h-4" />} label="DURATION" value="To be discussed" />
              <MetaItem icon={<CalendarCheck className="w-4 h-4" />} label="INDUSTRY" value={vacancy.industry} />
            </div>

            <ApplyButton
              variant="top"
              vacancyId={vacancy.id}
              vacancySlug={vacancy.slug}
              vacancyTitle={vacancy.title}
              vacancyCarerixId={vacancy.carerix_id}
            />
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {vacancy.intro_html ? (
                <IntroBlock html={vacancy.intro_html} />
              ) : (
                vacancy.summary && (
                  <p className="prose prose-sm max-w-none text-gray-600 leading-relaxed">{vacancy.summary}</p>
                )
              )}

              <ContentSection title="Job description" html={vacancy.vacancy_html} />
              <ContentSection title="Requirements"   html={vacancy.requirements_html} />
              <ContentSection title="What we offer"  html={vacancy.offer_html} />
              <ContentSection title="About the company" html={vacancy.company_html} fallbackText={vacancy.company_name} />
            </div>

            <div className="space-y-6">
              <ContactCard
                name={vacancy.consultant_name}
                title={vacancy.consultant_title}
                phone={vacancy.consultant_phone}
                email={vacancy.consultant_email}
                photo={vacancy.consultant_photo}
                contactHtml={vacancy.contact_html}
              />

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Quick Info
                </h4>
                <div className="space-y-3">
                  <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Type" value={vacancy.employment_type || '—'} />
                  <InfoRow icon={<IndustryIcon className="w-4 h-4" />} label="Industry" value={vacancy.industry} />
                  <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={vacancy.location || '—'} />
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="Posted" value={postedDisplay} />
                  <InfoRow icon={<Clock className="w-4 h-4" />} label="Updated" value={updatedDisplay} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Apply CTA */}
          <div className="mt-12">
            <ApplyButton
              variant="bottom"
              vacancyId={vacancy.id}
              vacancySlug={vacancy.slug}
              vacancyTitle={vacancy.title}
              vacancyCarerixId={vacancy.carerix_id}
            />
          </div>
        </div>
      </section>
    </>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function IntroBlock({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-600 leading-relaxed prose-p:mb-3 prose-strong:text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ContentSection({
  title,
  html,
  fallbackText,
}: {
  title: string;
  html: string | null;
  fallbackText?: string | null;
}) {
  if (!html || html.trim() === '') {
    if (!fallbackText) return null;
    return (
      <div>
        <h2 className="text-xl font-bold text-[#222c4a] mb-4">{title}</h2>
        <p className="text-gray-600 leading-relaxed">{fallbackText}</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-[#222c4a] mb-4">{title}</h2>
      <div
        className="prose prose-sm max-w-none text-gray-600 leading-relaxed
          prose-headings:text-[#222c4a] prose-headings:font-semibold
          prose-a:text-[#407df1] prose-a:no-underline hover:prose-a:underline
          prose-li:marker:text-[#407df1]
          prose-strong:text-gray-700
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_p]:mb-3 [&_li]:mb-1
          [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#222c4a] [&_h3]:mt-5 [&_h3]:mb-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function ContactCard({
  name,
  title,
  phone,
  email,
  photo,
  contactHtml,
}: {
  name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
  contactHtml: string | null;
}) {
  if (name) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photo} alt={name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#222c4a] flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-[#222c4a]">{name}</p>
              <p className="text-sm text-gray-500">{title || 'Recruitment Consultant'}</p>
            </div>
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors py-2"
            >
              <Phone className="w-4 h-4 text-gray-400" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors py-2"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              {email}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (contactHtml) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#222c4a] flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#222c4a]">Contact Person</p>
            <p className="text-sm text-gray-500">Recruitment Team</p>
          </div>
        </div>
        <div
          className="prose prose-sm max-w-none text-gray-600 prose-a:text-[#407df1]"
          dangerouslySetInnerHTML={{ __html: contactHtml }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-[#222c4a] flex items-center justify-center">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="font-bold text-[#222c4a]">Confair Group</p>
          <p className="text-sm text-gray-500">Recruitment Team</p>
        </div>
      </div>
      <a
        href="mailto:info@confair.com"
        className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors py-2"
      >
        <Mail className="w-4 h-4 text-gray-400" />
        info@confair.com
      </a>
    </div>
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
