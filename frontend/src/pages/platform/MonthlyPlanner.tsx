import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react';

interface DeclarationType {
  id: number;
  code: string;
  label: string;
  unit: string;
}

interface Correction {
  id: number;
  requested_amount: number;
  reason: string;
  status: string;
  decline_reason?: string;
}

interface PlannerEntry {
  id: number;
  declaration_date: string;
  declaration_type_id: number;
  imported_amount: number;
  applicable_fee: number;
  calculated_value: number;
  status: string;
  approval_stage: string;
  corrections: Correction[];
}

interface PlannerData {
  period: {
    id: number;
    month: number;
    year: number;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  declaration_types: DeclarationType[];
  planner: Record<string, Record<string, PlannerEntry>>;
  entries: PlannerEntry[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const stageColors: Record<string, string> = {
  pending_company_initial: 'bg-orange-100 text-orange-700',
  pending_placement: 'bg-blue-100 text-blue-700',
  pending_company_final: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

const correctionStatusColors: Record<string, string> = {
  requested: 'text-orange-600',
  approved: 'text-green-600',
  declined: 'text-red-600',
};

export default function MonthlyPlanner() {
  const { platformUser } = usePlatformAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<PlannerEntry | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Fetch periods list
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await client.apiCall.invoke({
          url: '/api/v1/payroll/periods',
          method: 'GET',
        });
        const periodsList = response.data || [];
        setPeriods(periodsList);

        const paramId = searchParams.get('period_id');
        if (paramId) {
          setSelectedPeriodId(Number(paramId));
        } else if (periodsList.length > 0) {
          setSelectedPeriodId(periodsList[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch periods:', err);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch planner data when period changes
  useEffect(() => {
    if (!selectedPeriodId) {
      setLoading(false);
      return;
    }

    const fetchPlanner = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { };
        if (platformUser?.company_id) params.company_id = String(platformUser.company_id);
        if (platformUser?.placement_id) params.placement_id = String(platformUser.placement_id);

        const response = await client.apiCall.invoke({
          url: `/api/v1/payroll/planner/${selectedPeriodId}`,
          method: 'GET',
          data: params,
        });
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch planner data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanner();
  }, [selectedPeriodId, platformUser]);

  // Generate days array for the period
  const getDays = (): string[] => {
    if (!data?.period) return [];
    const start = new Date(data.period.start_date);
    const end = new Date(data.period.end_date);
    const days: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const days = getDays();
  const types = data?.declaration_types || [];
  const planner = data?.planner || {};

  // Calculate column totals
  const getColumnTotal = (typeId: number): number => {
    let total = 0;
    for (const day of days) {
      const entry = planner[day]?.[String(typeId)];
      if (entry) {
        total += entry.imported_amount || 0;
        // Add approved corrections
        for (const corr of entry.corrections || []) {
          if (corr.status === 'approved') {
            total += corr.requested_amount;
          }
        }
      }
    }
    return total;
  };

  const getDayTotal = (day: string): number => {
    let total = 0;
    for (const type of types) {
      const entry = planner[day]?.[String(type.id)];
      if (entry) {
        total += entry.imported_amount || 0;
        for (const corr of entry.corrections || []) {
          if (corr.status === 'approved') {
            total += corr.requested_amount;
          }
        }
      }
    }
    return total;
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const idx = periods.findIndex((p) => p.id === selectedPeriodId);
    if (direction === 'next' && idx > 0) {
      setSelectedPeriodId(periods[idx - 1].id);
    } else if (direction === 'prev' && idx < periods.length - 1) {
      setSelectedPeriodId(periods[idx + 1].id);
    }
  };

  const dayOfWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  return (
    <PlatformLayout>
      <div className="max-w-full mx-auto">
        {/* Period selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-[#222c4a]">
                {data?.period ? `${MONTHS[data.period.month - 1]} ${data.period.year}` : 'Select a Period'}
              </h2>
              {data?.period && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  data.period.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                  data.period.status === 'open' ? 'bg-blue-100 text-blue-700' :
                  data.period.status === 'finalized' ? 'bg-green-100 text-green-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {data.period.status}
                </span>
              )}
            </div>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Period dropdown */}
          <select
            value={selectedPeriodId || ''}
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
          >
            <option value="">Select period...</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {MONTHS[p.month - 1]} {p.year}
              </option>
            ))}
          </select>
        </div>

        {/* Planner Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#407df1] mx-auto mb-4" />
            <p className="text-gray-500">Loading planner data...</p>
          </div>
        ) : !data?.period ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <p className="text-gray-500">No period selected. Create or select a payroll period.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#222c4a] text-white">
                    <th className="px-3 py-3 text-left font-semibold text-xs sticky left-0 bg-[#222c4a] z-10 w-28">Day</th>
                    {types.map((type) => (
                      <th key={type.id} className="px-3 py-3 text-center font-semibold text-xs min-w-[100px]">
                        {type.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-semibold text-xs min-w-[80px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const weekend = isWeekend(day);
                    const dayNum = new Date(day).getDate();
                    return (
                      <tr
                        key={day}
                        className={`border-b border-gray-50 ${weekend ? 'bg-gray-50/50' : 'hover:bg-blue-50/30'}`}
                      >
                        <td className={`px-3 py-2 font-medium sticky left-0 z-10 ${weekend ? 'bg-gray-50/50 text-gray-400' : 'bg-white text-[#222c4a]'}`}>
                          <span className="text-xs">{dayOfWeek(day)}</span>{' '}
                          <span className="font-semibold">{dayNum}</span>
                        </td>
                        {types.map((type) => {
                          const entry = planner[day]?.[String(type.id)];
                          const hasCorrections = entry?.corrections && entry.corrections.length > 0;
                          const approvedCorr = entry?.corrections?.filter((c) => c.status === 'approved') || [];
                          const pendingCorr = entry?.corrections?.filter((c) => c.status === 'requested') || [];
                          const corrTotal = approvedCorr.reduce((sum, c) => sum + c.requested_amount, 0);
                          const finalAmount = (entry?.imported_amount || 0) + corrTotal;

                          return (
                            <td
                              key={type.id}
                              className="px-3 py-2 text-center relative cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => entry && setSelectedCell(entry)}
                            >
                              {entry ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-[#222c4a]">{entry.imported_amount}</div>
                                  {hasCorrections && (
                                    <>
                                      {approvedCorr.map((c) => (
                                        <div key={c.id} className="text-xs text-green-600 font-medium">
                                          {c.requested_amount > 0 ? '+' : ''}{c.requested_amount}
                                        </div>
                                      ))}
                                      {pendingCorr.map((c) => (
                                        <div key={c.id} className="text-xs text-orange-500 italic">
                                          {c.requested_amount > 0 ? '+' : ''}{c.requested_amount}?
                                        </div>
                                      ))}
                                      {corrTotal !== 0 && (
                                        <div className="text-xs font-bold text-[#222c4a] border-t border-gray-200 pt-0.5">
                                          ={finalAmount}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {/* Status dot */}
                                  <div className="flex justify-center mt-1">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                      entry.approval_stage === 'approved' ? 'bg-green-500' :
                                      entry.approval_stage === 'declined' ? 'bg-red-500' :
                                      entry.approval_stage?.includes('pending') ? 'bg-orange-400' :
                                      'bg-gray-300'
                                    }`} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-[#222c4a] bg-gray-50/50">
                          {getDayTotal(day) || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-[#222c4a] text-white font-semibold">
                    <td className="px-3 py-3 sticky left-0 bg-[#222c4a] z-10">Total</td>
                    {types.map((type) => (
                      <td key={type.id} className="px-3 py-3 text-center">
                        {getColumnTotal(type.id) || '—'}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      {types.reduce((sum, t) => sum + getColumnTotal(t.id), 0) || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" /> Pending
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Approved
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Declined
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-600 font-medium">+20</span> Approved correction
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-orange-500 italic">+10?</span> Pending correction
          </div>
        </div>

        {/* Cell Detail Modal */}
        {selectedCell && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCell(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#222c4a]">Entry Details</h3>
                <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{selectedCell.declaration_date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Original Amount</span>
                  <span className="font-medium">{selectedCell.imported_amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColors[selectedCell.approval_stage] || 'bg-gray-100 text-gray-700'}`}>
                    {selectedCell.approval_stage?.replace(/_/g, ' ')}
                  </span>
                </div>

                {selectedCell.corrections && selectedCell.corrections.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold text-[#222c4a] mb-2">Corrections</h4>
                    {selectedCell.corrections.map((corr) => (
                      <div key={corr.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                        <div className="flex justify-between text-sm">
                          <span className={`font-medium ${correctionStatusColors[corr.status]}`}>
                            {corr.requested_amount > 0 ? '+' : ''}{corr.requested_amount}
                          </span>
                          <span className={`text-xs font-medium ${correctionStatusColors[corr.status]}`}>
                            {corr.status}
                          </span>
                        </div>
                        {corr.reason && <p className="text-xs text-gray-500 mt-1">{corr.reason}</p>}
                        {corr.decline_reason && (
                          <p className="text-xs text-red-500 mt-1">Decline reason: {corr.decline_reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}