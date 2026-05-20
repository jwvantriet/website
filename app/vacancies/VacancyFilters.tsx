'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Plane,
  Ship,
  Fuel,
  Briefcase,
} from 'lucide-react';

const INDUSTRIES = [
  { label: 'All Industries', value: 'all', icon: Briefcase, color: 'bg-[#222c4a]' },
  { label: 'Aviation', value: 'Aviation', icon: Plane, color: 'bg-blue-500' },
  { label: 'Maritime', value: 'Maritime', icon: Ship, color: 'bg-emerald-500' },
  { label: 'Offshore Energy', value: 'Offshore', icon: Fuel, color: 'bg-amber-500' },
];

export default function VacancyFilters({
  activeIndustry,
  initialQuery,
}: {
  activeIndustry: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  // Debounce search → push to URL
  useEffect(() => {
    if (query === initialQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query) next.set('q', query);
      else next.delete('q');
      router.push(`/vacancies${next.toString() ? `?${next}` : ''}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, initialQuery, params, router]);

  const setIndustry = (industry: string) => {
    const next = new URLSearchParams(params.toString());
    if (industry === 'all') next.delete('industry');
    else next.set('industry', industry);
    router.push(`/vacancies${next.toString() ? `?${next}` : ''}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10 -mt-12 relative z-20">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, keyword, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 mr-1 hidden lg:block" />
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            const isActive = activeIndustry === ind.value;
            return (
              <button
                key={ind.value}
                onClick={() => setIndustry(ind.value)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? `${ind.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {ind.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
