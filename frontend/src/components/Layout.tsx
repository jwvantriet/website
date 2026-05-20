import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Phone, Mail, MapPin } from "lucide-react";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  {
    label: "Industries",
    path: "/services",
    children: [
      { label: "Aviation", path: "/services#aviation" },
      { label: "Maritime", path: "/services#maritime" },
      { label: "Offshore", path: "/services#offshore" },
    ],
  },
  { label: "Team", path: "/team" },
  { label: "Vacancies", path: "/vacancies" },
  { label: "Blog", path: "/blog-posts" },
  { label: "Contact", path: "/contact" },
];

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#222c4a] shadow-lg">
      {/* Top bar */}
      <div className="hidden md:block bg-[#1a2340] text-white/70 text-sm">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 mt-[0px] mr-[0px] mb-[0px] ml-[0px] pt-[0px] pr-[0px] pb-[0px] pl-[0px] rounded-none text-[14px] font-normal text-[#FFFFFFB3] bg-[#00000000] opacity-100">
              <Mail className="w-3.5 h-3.5" />{"info@confair.com"}
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

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center">
          <img
            src="/assets/logo_confair-group_diap.png"
            alt="Confair Group"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop nav */}
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
                  to={link.path}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-1 ${
                    isActive(link.path)
                      ? "text-[#fbc134]"
                      : "text-white hover:text-[#fbc134]"
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
                        to={child.path}
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
                to={link.path}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  isActive(link.path)
                    ? "text-[#fbc134]"
                    : "text-white hover:text-[#fbc134]"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
          <Link
            to="/platform/login"
            className="ml-4 bg-[#fbc134] text-[#222c4a] px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#e5af2e] transition-colors"
          >
            Login
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-[#222c4a] border-t border-white/10 px-6 pb-4">
          {navLinks.map((link) => (
            <div key={link.label}>
              <Link
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-semibold border-b border-white/5 ${
                  isActive(link.path) ? "text-[#fbc134]" : "text-white"
                }`}
              >
                {link.label}
              </Link>
              {link.children &&
                link.children.map((child) => (
                  <Link
                    key={child.label}
                    to={child.path}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 pl-4 text-sm text-white/70 hover:text-[#fbc134]"
                  >
                    {child.label}
                  </Link>
                ))}
            </div>
          ))}
          <Link
            to="/platform/login"
            onClick={() => setMobileOpen(false)}
            className="block mt-3 bg-[#fbc134] text-[#222c4a] px-5 py-2.5 rounded-lg text-sm font-bold text-center"
          >
            Login
          </Link>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[#222c4a] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
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
              We provide highly skilled, certified professionals to ensure
              compliance, safety, and operational continuity across critical
              industries.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-[#fbc134] mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/about"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Industries
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Hire Talent
                </Link>
              </li>
              <li>
                <Link
                  to="/vacancies"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Find Jobs
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Get in Touch
                </Link>
              </li>
              <li>
                <Link
                  to="/platform/login"
                  className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                >
                  Platform Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Industries */}
          <div>
            <h4 className="font-semibold text-[#fbc134] mb-4 text-sm uppercase tracking-wider">
              Our Industries
            </h4>
            <ul className="space-y-2.5">
              {["Confair Aviation", "Confair Maritime", "Confair Offshore"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      to="/services"
                      className="text-white/60 hover:text-[#fbc134] text-sm transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact – HQ Netherlands */}
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
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="text-white/40 hover:text-[#fbc134] text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-use" className="text-white/40 hover:text-[#fbc134] text-sm transition-colors">
              Terms of Use
            </Link>
            <Link to="/admin/vacancies" className="text-white/20 hover:text-[#fbc134] text-sm transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}