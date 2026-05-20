'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Phone, Mail, MapPin } from 'lucide-react';

// /team and /blog-posts are intentionally hidden from the nav until the
// content + sync work is done. The routes still build; they just aren't
// linked from the header or footer and are disallowed in robots.txt.
const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  {
    label: 'Industries',
    path: '/services',
    children: [
      { label: 'Aviation', path: '/services#aviation' },
      { label: 'Maritime', path: '/services#maritime' },
      { label: 'Offshore', path: '/services#offshore' },
    ],
  },
  { label: 'Vacancies', path: '/vacancies' },
  { label: 'Contact', path: '/contact' },
];

const PLATFORM_LOGIN_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://app.confair.com/login';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#222c4a] shadow-lg">
      <div className="hidden md:block bg-[#1a2340] text-white/70 text-sm">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              info@confair.com
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> +31 850 711 950
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Utrecht, NL &nbsp;|&nbsp; Dubai, UAE
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo_confair-group_diap.png"
            alt="Confair Group"
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <Link
                  href={link.path}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-1 ${
                    isActive(link.path)
                      ? 'text-[#fbc134]'
                      : 'text-white hover:text-[#fbc134]'
                  }`}
                >
                  {link.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </Link>
                {servicesOpen && (
                  <div className="absolute top-full left-0 mt-0 w-56 bg-white rounded-lg shadow-xl py-2 border border-gray-100">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.path}
                        className="block px-4 py-2.5 text-sm text-[#222c4a] hover:bg-[#f2eee7] hover:text-[#407df1] transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.path}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  isActive(link.path)
                    ? 'text-[#fbc134]'
                    : 'text-white hover:text-[#fbc134]'
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          <a
            href={PLATFORM_LOGIN_URL}
            className="ml-4 bg-[#fbc134] text-[#222c4a] px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#e5af2e] transition-colors"
          >
            Login
          </a>
        </nav>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#222c4a] border-t border-white/10 px-6 pb-4">
          {navLinks.map((link) => (
            <div key={link.label}>
              <Link
                href={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-semibold border-b border-white/5 ${
                  isActive(link.path) ? 'text-[#fbc134]' : 'text-white'
                }`}
              >
                {link.label}
              </Link>
              {link.children &&
                link.children.map((child) => (
                  <Link
                    key={child.label}
                    href={child.path}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 pl-4 text-sm text-white/70 hover:text-[#fbc134]"
                  >
                    {child.label}
                  </Link>
                ))}
            </div>
          ))}
          <a
            href={PLATFORM_LOGIN_URL}
            onClick={() => setMobileOpen(false)}
            className="block mt-3 bg-[#fbc134] text-[#222c4a] px-5 py-2.5 rounded-lg text-sm font-bold text-center"
          >
            Login
          </a>
        </div>
      )}
    </header>
  );
}
