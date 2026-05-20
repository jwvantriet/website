import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  AlertCircle,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
  FileText,
  Upload,
  DollarSign,
} from 'lucide-react';

const agencyLinks = [
  { label: 'Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'Payroll Periods', path: '/platform/payroll-periods', icon: Calendar },
  { label: 'Monthly Planner', path: '/platform/planner', icon: FileText },
  { label: 'Upload Declarations', path: '/platform/upload', icon: Upload },
  { label: 'Approvals', path: '/platform/approvals', icon: CheckSquare },
  { label: 'Corrections', path: '/platform/corrections', icon: AlertCircle },
];

const companyLinks = [
  { label: 'Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'Monthly Planner', path: '/platform/planner', icon: FileText },
  { label: 'Approvals', path: '/platform/approvals', icon: CheckSquare },
  { label: 'Corrections', path: '/platform/corrections', icon: AlertCircle },
];

const placementLinks = [
  { label: 'Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'My Declarations', path: '/platform/planner', icon: FileText },
  { label: 'My Approvals', path: '/platform/approvals', icon: CheckSquare },
  { label: 'My Corrections', path: '/platform/corrections', icon: AlertCircle },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { platformUser, logout, isAgency, isCompany } = usePlatformAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const links = isAgency ? agencyLinks : isCompany ? companyLinks : placementLinks;

  const handleLogout = () => {
    logout();
    navigate('/platform/login');
  };

  const roleLabel =
    platformUser?.role === 'agency_admin'
      ? 'Agency Admin'
      : platformUser?.role === 'agency_ops'
        ? 'Agency Ops'
        : platformUser?.role === 'company'
          ? 'Company'
          : 'Placement';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#222c4a] text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/" className="flex items-center">
              <img src="/assets/logo_confair-group_diap.png" alt="Confair" className="h-8 w-auto" />
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white">
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#fbc134] text-[#222c4a]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                title={link.label}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#fbc134] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#222c4a]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{platformUser?.name || 'User'}</p>
                  <p className="text-xs text-white/50">{roleLabel}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="text-white/60 hover:text-white" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#222c4a] text-white z-50 flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
              <img src="https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-04-06/22e7cc4f-06ec-4602-b760-3212c218f72d.png" alt="Confair" className="h-8 w-auto" />
              <button onClick={() => setMobileOpen(false)} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 px-2">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#fbc134] text-[#222c4a]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-600" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[#222c4a]">
              {links.find((l) => l.path === location.pathname)?.label || 'Platform'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-white bg-[#407df1] px-2.5 py-1 rounded-full">
              {roleLabel}
            </span>
            <Link to="/" className="text-sm text-gray-500 hover:text-[#407df1] transition-colors">
              ← Back to Website
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}