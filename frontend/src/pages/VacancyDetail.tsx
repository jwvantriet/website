import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { client } from "@/lib/api";
import Layout from "@/components/Layout";
import ApplyModal from "@/components/ApplyModal";
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
  Share2,
  Loader2,
  Timer,
  CalendarDays,
  CalendarCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";

interface VacancyDetailData {
  id: string;
  title: string;
  industry: string;
  location: string;
  employment_type: string;
  summary: string;
  posted_date: string;
  modification_date: string;
  apply_url: string | null;
  intro_html: string;
  vacancy_html: string;
  requirements_html: string;
  offer_html: string;
  company_html: string;
  contact_html: string;
  publication_start: string;
  publication_end: string;
  reference_number?: string;
  duration?: string;
  schedule?: string;
  start_date?: string;
  consultant_name?: string;
  consultant_title?: string;
  consultant_phone?: string;
  consultant_email?: string;
  consultant_photo?: string;
  categories?: string[];
}

const industryConfig: Record<
  string,
  { icon: typeof Plane; color: string; bg: string; tagBg: string; tagText: string }
> = {
  Aviation: {
    icon: Plane,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    tagBg: "bg-blue-50",
    tagText: "text-blue-700",
  },
  Maritime: {
    icon: Ship,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    tagBg: "bg-emerald-50",
    tagText: "text-emerald-700",
  },
  Offshore: {
    icon: Fuel,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    tagBg: "bg-amber-50",
    tagText: "text-amber-700",
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function VacancyDetail() {
  const { id } = useParams<{ id: string }>();
  const [vacancy, setVacancy] = useState<VacancyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const rawResponse = await client.apiCall.invoke({
          url: `/api/v1/vacancies/detail/${id}`,
          method: "GET",
        });
        const rawData = rawResponse.data as { vacancy: VacancyDetailData };
        if (rawData?.vacancy) {
          setVacancy(rawData.vacancy);
        } else {
          setError("Vacancy not found");
        }
      } catch (err) {
        console.error("Failed to fetch vacancy detail:", err);
        setError("Failed to load vacancy details. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = vacancy?.title || "Job Vacancy";
    const shareUrls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      x: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "noopener,noreferrer,width=600,height=400");
    }
  };

  if (loading) {
    return (
      <Layout>
        <section className="bg-gray-50 min-h-screen py-12">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-[#407df1] animate-spin" />
              <span className="ml-3 text-gray-500">Loading vacancy details...</span>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (error || !vacancy) {
    return (
      <Layout>
        <section className="bg-gray-50 min-h-screen py-12">
          <div className="max-w-5xl mx-auto px-6">
            <Link
              to="/vacancies"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#222c4a] transition-colors mb-8 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Vacancies
            </Link>
            <div className="text-center py-20">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                {error || "This vacancy could not be found"}
              </h2>
              <p className="text-gray-400 mb-6">
                The vacancy may have been removed or the link may be incorrect.
              </p>
              <Link
                to="/vacancies"
                className="inline-flex items-center gap-2 bg-[#407df1] text-white px-6 py-3 rounded-xl hover:bg-[#3060c0] transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                View All Vacancies
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const config = industryConfig[vacancy.industry] || industryConfig.Aviation;
  const IndustryIcon = config.icon;
  const categories = vacancy.categories || [vacancy.industry];

  return (
    <Layout>
      {/* Apply Modal */}
      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        vacancyTitle={vacancy.title}
        vacancyId={vacancy.id}
        applyUrl={vacancy.apply_url}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-[#222c4a] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link to="/vacancies" className="hover:text-[#222c4a] transition-colors">
              Vacancies
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#222c4a] font-medium truncate max-w-[300px]">
              {vacancy.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <section className="bg-gray-50 py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header Area */}
          <div className="mb-10">
            {/* Category Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {categories.map((cat, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.tagBg} ${config.tagText} border border-current/10`}
                >
                  {cat}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#222c4a] mb-3 leading-tight">
              {vacancy.title}
            </h1>

            {/* Reference Number */}
            {vacancy.reference_number && (
              <p className="text-sm text-gray-400 mb-6">
                Ref#: {vacancy.reference_number}
              </p>
            )}

            {/* Job Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              <MetaItem
                icon={<Briefcase className="w-4 h-4" />}
                label="TYPE OF WORK"
                value={vacancy.employment_type}
              />
              <MetaItem
                icon={<MapPin className="w-4 h-4" />}
                label="LOCATION"
                value={vacancy.location}
              />
              <MetaItem
                icon={<CalendarDays className="w-4 h-4" />}
                label="START DATE"
                value={vacancy.start_date ? formatDate(vacancy.start_date) : formatDate(vacancy.posted_date)}
              />
              <MetaItem
                icon={<Timer className="w-4 h-4" />}
                label="DURATION"
                value={vacancy.duration || "To be discussed"}
              />
              <MetaItem
                icon={<CalendarCheck className="w-4 h-4" />}
                label="INDUSTRY"
                value={vacancy.industry}
              />
            </div>

            {/* Apply CTA */}
            <div className="bg-[#222c4a] rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider mb-1">
                  Take the next step
                </p>
                <p className="text-white/70 text-sm">
                  Ready to advance your career? Apply now for this opportunity.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="flex-shrink-0 bg-[#fbc134] text-[#222c4a] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20"
              >
                Apply for this job
              </button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Introduction */}
              {vacancy.intro_html && (
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed prose-p:mb-3 prose-strong:text-gray-700
                  [&_.vacancy-meta]:bg-gray-50 [&_.vacancy-meta]:rounded-xl [&_.vacancy-meta]:p-4 [&_.vacancy-meta]:mt-4 [&_.vacancy-meta]:border [&_.vacancy-meta]:border-gray-200
                  [&_.vacancy-meta_p]:mb-1.5 [&_.vacancy-meta_p]:text-sm [&_.vacancy-meta_strong]:text-[#222c4a]">
                  <div dangerouslySetInnerHTML={{ __html: vacancy.intro_html }} />
                </div>
              )}

              {/* Vacancy Details / Job Description */}
              {vacancy.vacancy_html && (
                <ContentSection title="Job description" html={vacancy.vacancy_html} />
              )}

              {/* Requirements */}
              {vacancy.requirements_html && (
                <ContentSection title="Requirements" html={vacancy.requirements_html} />
              )}

              {/* What We Offer */}
              {vacancy.offer_html && (
                <ContentSection title="What we offer" html={vacancy.offer_html} />
              )}

              {/* Company Information */}
              {vacancy.company_html && (
                <ContentSection title="About the company" html={vacancy.company_html} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Consultant / Contact Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {vacancy.consultant_name ? (
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {vacancy.consultant_photo ? (
                        <img
                          src={vacancy.consultant_photo}
                          alt={vacancy.consultant_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#222c4a] flex items-center justify-center">
                          <User className="w-7 h-7 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[#222c4a]">
                          {vacancy.consultant_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {vacancy.consultant_title || "Recruitment Consultant"}
                        </p>
                      </div>
                    </div>
                    {vacancy.consultant_phone && (
                      <a
                        href={`tel:${vacancy.consultant_phone}`}
                        className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors py-2"
                      >
                        <Phone className="w-4 h-4 text-gray-400" />
                        {vacancy.consultant_phone}
                      </a>
                    )}
                    {vacancy.consultant_email && (
                      <a
                        href={`mailto:${vacancy.consultant_email}`}
                        className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#407df1] transition-colors py-2"
                      >
                        <Mail className="w-4 h-4 text-gray-400" />
                        {vacancy.consultant_email}
                      </a>
                    )}
                  </div>
                ) : vacancy.contact_html ? (
                  <div className="p-6">
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
                      dangerouslySetInnerHTML={{ __html: vacancy.contact_html }}
                    />
                  </div>
                ) : (
                  <div className="p-6">
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
                )}
              </div>

              {/* Quick Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Quick Info
                </h4>
                <div className="space-y-3">
                  <InfoRow
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Type"
                    value={vacancy.employment_type}
                  />
                  <InfoRow
                    icon={<IndustryIcon className="w-4 h-4" />}
                    label="Industry"
                    value={vacancy.industry}
                  />
                  <InfoRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Location"
                    value={vacancy.location}
                  />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Posted"
                    value={formatDate(vacancy.posted_date)}
                  />
                  {vacancy.modification_date &&
                    vacancy.modification_date !== vacancy.posted_date && (
                      <InfoRow
                        icon={<Clock className="w-4 h-4" />}
                        label="Updated"
                        value={formatDate(vacancy.modification_date)}
                      />
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Apply CTA */}
          <div className="mt-12 bg-[#222c4a] rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider mb-1">
                Take the next step
              </p>
              <p className="text-white/70 text-sm">
                Don&apos;t miss this opportunity. Apply today.
              </p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex-shrink-0 bg-[#fbc134] text-[#222c4a] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20"
            >
              Apply for this job
            </button>
          </div>

          {/* Share Section */}
          <div className="mt-8 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-500">Share this job</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare("linkedin")}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] transition-all text-gray-500"
                title="Share on LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </button>
              <button
                onClick={() => handleShare("x")}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all text-gray-500"
                title="Share on X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                onClick={() => handleShare("facebook")}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2] transition-all text-gray-500"
                title="Share on Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all text-gray-500"
                title="Copy link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

/* Job meta item - displayed in the grid below the title */
function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-1.5 text-sm font-medium text-[#222c4a]">
        <span className="text-gray-400">{icon}</span>
        {value}
      </div>
    </div>
  );
}

/* Content section with heading and HTML body */
function ContentSection({ title, html }: { title: string; html: string }) {
  if (!html || html.trim() === "") return null;

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
          [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#222c4a] [&_h3]:mt-5 [&_h3]:mb-2
          [&_.vacancy-meta]:bg-gray-50 [&_.vacancy-meta]:rounded-xl [&_.vacancy-meta]:p-4 [&_.vacancy-meta]:mt-4 [&_.vacancy-meta]:border [&_.vacancy-meta]:border-gray-200
          [&_.vacancy-meta_p]:mb-1.5 [&_.vacancy-meta_p]:text-sm [&_.vacancy-meta_strong]:text-[#222c4a]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* Sidebar info row */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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