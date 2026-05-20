import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import {
  Calendar,
  FileText,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Users,
} from 'lucide-react';

interface DashboardStats {
  total_periods: number;
  total_entries: number;
  pending_approvals: number;
  total_corrections: number;
  pending_corrections: number;
}

export default function Dashboard() {
  const { platformUser, isAgency, isCompany, isPlacement } = usePlatformAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params: Record<string, string> = { role: platformUser?.role || '' };
        if (platformUser?.company_id) params.company_id = String(platformUser.company_id);
        if (platformUser?.placement_id) params.placement_id = String(platformUser.placement_id);

        const response = await client.apiCall.invoke({
          url: '/api/v1/payroll/dashboard-stats',
          method: 'GET',
          data: params,
        });
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [platformUser]);

  const roleLabel =
    platformUser?.role === 'agency_admin'
      ? 'Agency Administrator'
      : platformUser?.role === 'agency_ops'
        ? 'Agency Operations'
        : platformUser?.role === 'company'
          ? 'Company Manager'
          : 'Placement';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    {
      label: 'Payroll Periods',
      value: stats?.total_periods ?? '-',
      icon: Calendar,
      color: '#407df1',
      link: '/platform/payroll-periods',
      show: isAgency,
    },
    {
      label: 'Declaration Entries',
      value: stats?.total_entries ?? '-',
      icon: FileText,
      color: '#61bef6',
      link: '/platform/planner',
      show: true,
    },
    {
      label: 'Pending Approvals',
      value: stats?.pending_approvals ?? '-',
      icon: CheckSquare,
      color: '#fbc134',
      link: '/platform/approvals',
      show: true,
    },
    {
      label: 'Pending Corrections',
      value: stats?.pending_corrections ?? '-',
      icon: AlertCircle,
      color: '#ef4444',
      link: '/platform/corrections',
      show: true,
    },
  ];

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#222c4a]">
            {greeting()}, {platformUser?.name || 'User'}
          </h2>
          <p className="text-gray-500 mt-1">{roleLabel} — Payroll Module</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards
              .filter((s) => s.show)
              .map((card) => (
                <Link
                  key={card.label}
                  to={card.link}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${card.color}15` }}
                    >
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-[#222c4a]">{card.value}</p>
                </Link>
              ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#222c4a] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAgency && (
              <>
                <Link
                  to="/platform/payroll-periods"
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#407df1] hover:bg-[#407df1]/5 transition-all"
                >
                  <Calendar className="w-5 h-5 text-[#407df1]" />
                  <span className="text-sm font-medium text-[#222c4a]">Manage Payroll Periods</span>
                </Link>
                <Link
                  to="/platform/upload"
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#61bef6] hover:bg-[#61bef6]/5 transition-all"
                >
                  <TrendingUp className="w-5 h-5 text-[#61bef6]" />
                  <span className="text-sm font-medium text-[#222c4a]">Upload Declarations</span>
                </Link>
              </>
            )}
            <Link
              to="/platform/planner"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#fbc134] hover:bg-[#fbc134]/5 transition-all"
            >
              <FileText className="w-5 h-5 text-[#fbc134]" />
              <span className="text-sm font-medium text-[#222c4a]">View Monthly Planner</span>
            </Link>
            <Link
              to="/platform/approvals"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#22c55e] hover:bg-[#22c55e]/5 transition-all"
            >
              <CheckSquare className="w-5 h-5 text-[#22c55e]" />
              <span className="text-sm font-medium text-[#222c4a]">Review Approvals</span>
            </Link>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}