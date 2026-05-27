import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';

const PLATFORM_LOGIN_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://app.confair.com/login';

export default function Footer() {
  return (
    <footer className="bg-[#222c4a] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logo_confair-group_diap.png"
                alt="Confair Group"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-2">
              Contracting solutions for aviation, maritime, and offshore operations.
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              We provide highly skilled, certified professionals to ensure compliance,
              safety, and operational continuity across critical industries.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#fbc134] mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">About</Link></li>
              <li><Link href="/services" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">Industries</Link></li>
              <li><Link href="/contact" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">Hire Talent</Link></li>
              <li><Link href="/vacancies" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">Find Jobs</Link></li>
              <li><Link href="/contact" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">Contact</Link></li>
              <li><a href={PLATFORM_LOGIN_URL} className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">Platform Login</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#fbc134] mb-4 text-sm uppercase tracking-wider">
              Our Industries
            </h4>
            <ul className="space-y-2.5">
              {['Confair Aviation', 'Confair Maritime', 'Confair Offshore'].map((item) => (
                <li key={item}>
                  <Link href="/services" className="text-white/60 hover:text-[#fbc134] text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#fbc134] mb-4 text-sm uppercase tracking-wider">
              Netherlands Headquarters
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                Tennesseedreef 7e, 3565 CK Utrecht
              </li>
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                +31 850 711 950
              </li>
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                netherlands@confair.com
              </li>
            </ul>

            <h4 className="font-semibold text-[#fbc134] mb-4 mt-6 text-sm uppercase tracking-wider">
              Middle East Headquarters
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                The Prime Tower, Office 2001-25, Business Bay, Dubai
              </li>
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                +971 55 692 4772
              </li>
              <li className="flex items-start gap-2.5 text-white/60 text-sm">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#61bef6]" />
                uae@confair.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Confair Group. All rights reserved.
          </p>
          <div className="flex gap-6 flex-wrap justify-center">
            <Link href="/privacy-policy" className="text-white/40 hover:text-[#fbc134] text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/cookie-policy" className="text-white/40 hover:text-[#fbc134] text-sm transition-colors">
              Cookie Policy
            </Link>
            <button
              type="button"
              onClick={() => {
                // Termly exposes a global helper to re-open the consent
                // banner so visitors can change their preferences.
                if (typeof window !== 'undefined') {
                  type TermlyWindow = Window & { displayPreferenceModal?: () => void };
                  (window as TermlyWindow).displayPreferenceModal?.();
                }
              }}
              className="text-white/40 hover:text-[#fbc134] text-sm transition-colors cursor-pointer"
            >
              Cookie Preferences
            </button>
            <Link href="/terms-of-use" className="text-white/40 hover:text-[#fbc134] text-sm transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
