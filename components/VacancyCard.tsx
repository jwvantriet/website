import Link from 'next/link';
import { MapPin, Clock, Briefcase, ArrowRight, Plane, Ship, Fuel } from 'lucide-react';
import type { Vacancy } from '@/lib/types';

const INDUSTRY_CONFIG = {
  Aviation: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Plane, border: 'hover:border-blue-200' },
  Maritime: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Ship, border: 'hover:border-emerald-200' },
  Offshore: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Fuel, border: 'hover:border-amber-200' },
} as const;

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function isNew(dateStr: string): boolean {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  return diff <= 7;
}

export default function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  const config = INDUSTRY_CONFIG[vacancy.industry] || INDUSTRY_CONFIG.Aviation;
  const IndustryIcon = config.icon;
  // Listings show the "updated" date (visit − 14 days), matching the detail page.
  const updatedIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const vacancyIsNew = isNew(updatedIso);

  return (
    <Link
      href={`/vacancies/${vacancy.slug}`}
      className={`group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full no-underline ${config.border}`}
    >
      <div className="p-6 flex flex-col flex-1">
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
            {daysAgo(updatedIso)}
          </span>
        </div>

        <h3 className="text-lg font-bold text-[#222c4a] mb-3 group-hover:text-[#407df1] transition-colors leading-tight line-clamp-2">
          {vacancy.title}
        </h3>

        <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-500">
          {vacancy.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {vacancy.location}
            </span>
          )}
          {vacancy.employment_type && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {vacancy.employment_type}
            </span>
          )}
        </div>

        {vacancy.summary && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1 line-clamp-3">
            {vacancy.summary}
          </p>
        )}

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
