import { Link } from "react-router-dom";
import { MapPin, Clock, Briefcase, ArrowRight, Plane, Ship, Fuel } from "lucide-react";

export interface Vacancy {
  id: string;
  title: string;
  industry: string;
  location: string;
  employment_type: string;
  summary: string;
  posted_date: string;
  modification_date?: string;
  apply_url: string | null;
}

const INDUSTRY_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    dot: string;
    icon: typeof Plane;
    gradient: string;
    border: string;
  }
> = {
  Aviation: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    icon: Plane,
    gradient: "from-blue-500/5 to-transparent",
    border: "hover:border-blue-200",
  },
  Maritime: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    icon: Ship,
    gradient: "from-emerald-500/5 to-transparent",
    border: "hover:border-emerald-200",
  },
  Offshore: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    icon: Fuel,
    gradient: "from-amber-500/5 to-transparent",
    border: "hover:border-amber-200",
  },
};

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function isNew(dateStr: string): boolean {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff <= 7;
}

interface VacancyCardProps {
  vacancy: Vacancy;
  compact?: boolean;
}

export default function VacancyCard({ vacancy, compact = false }: VacancyCardProps) {
  const config = INDUSTRY_CONFIG[vacancy.industry] || INDUSTRY_CONFIG.Aviation;
  const IndustryIcon = config.icon;
  const vacancyIsNew = isNew(vacancy.posted_date);

  return (
    <Link
      to={`/vacancies/${vacancy.id}`}
      className={`group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full no-underline ${config.border}`}
    >
      {/* Top gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="p-6 flex flex-col flex-1">
        {/* Industry badge + date + new tag */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${config.bg} ${config.text}`}
            >
              <IndustryIcon className="w-3 h-3" />
              {vacancy.industry}
            </span>
            {vacancyIsNew && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbc134] text-[#222c4a] uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysAgo(vacancy.posted_date)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-[#222c4a] mb-3 group-hover:text-[#407df1] transition-colors leading-tight line-clamp-2">
          {vacancy.title}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {vacancy.location}
          </span>
          {vacancy.employment_type && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {vacancy.employment_type}
            </span>
          )}
        </div>

        {/* Summary */}
        {!compact && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1 line-clamp-3">
            {vacancy.summary}
          </p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-4 border-t border-gray-50">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#222c4a] group-hover:text-[#fbc134] transition-colors">
            View Details
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}