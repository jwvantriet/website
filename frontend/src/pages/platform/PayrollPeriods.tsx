import { useEffect, useState } from 'react';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { Plus, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PayrollPeriod {
  id: number;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string;
  finalized_at: string | null;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  finalized: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};

export default function PayrollPeriods() {
  const { platformUser } = usePlatformAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchPeriods = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/payroll/periods',
        method: 'GET',
      });
      setPeriods(response.data || []);
    } catch (err) {
      console.error('Failed to fetch periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await client.apiCall.invoke({
        url: '/api/v1/payroll/periods',
        method: 'POST',
        data: {
          month: newMonth,
          year: newYear,
          created_by: String(platformUser?.id || ''),
        },
      });
      setShowCreate(false);
      await fetchPeriods();
    } catch (err) {
      console.error('Failed to create period:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <PlatformLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#222c4a]">Payroll Periods</h2>
            <p className="text-sm text-gray-500">Manage monthly payroll processing periods</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-[#407df1] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3568d4] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Period
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-[#222c4a] mb-4">Create New Period</h3>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-[#407df1] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#3568d4] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Periods List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payroll periods yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => navigate(`/platform/planner?period_id=${period.id}`)}
                className="w-full bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#407df1]/30 transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#407df1]/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#407df1]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#222c4a]">
                      {MONTHS[period.month - 1]} {period.year}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {period.start_date} — {period.end_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[period.status] || 'bg-gray-100 text-gray-700'}`}>
                    {period.status.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#407df1] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}