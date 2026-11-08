import { Mail, Phone } from 'lucide-react';
import { NEW_SECTOR_CONTACT } from '@/lib/verticals';

/**
 * The named person for a sector Confair is new to. In maritime and offshore a
 * buyer hires a person before a company; a name and a direct line is the
 * credibility a new entrant can honestly offer.
 */
export default function SectorContactCard({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const c = NEW_SECTOR_CONTACT;
  const dark = tone === 'dark';
  return (
    <div className={`rounded-2xl p-6 ${dark ? 'bg-white/10 text-white' : 'bg-white shadow-sm border border-gray-100'}`}>
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="w-14 h-14 rounded-full bg-yellow text-navy font-bold flex items-center justify-center shrink-0"
        >
          {c.initials}
        </div>
        <div>
          <p className={`font-bold text-lg ${dark ? 'text-white' : 'text-navy'}`}>{c.name}</p>
          <p className={`text-sm ${dark ? 'text-white/70' : 'text-navy-500'}`}>{c.role}</p>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <a href={`mailto:${c.email}`} className={`flex items-center gap-2 ${dark ? 'text-white hover:text-yellow' : 'text-navy hover:text-cblue-700'}`}>
          <Mail className="w-4 h-4 shrink-0" /> {c.email}
        </a>
        <a href={c.phoneHref} className={`flex items-center gap-2 ${dark ? 'text-white hover:text-yellow' : 'text-navy hover:text-cblue-700'}`}>
          <Phone className="w-4 h-4 shrink-0" /> {c.phone}
        </a>
      </div>
    </div>
  );
}
