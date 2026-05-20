import { useEffect, useState } from 'react';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { Plus, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';

interface CorrectionRequest {
  id: number;
  declaration_entry_id: number | null;
  payroll_period_id: number;
  placement_id: number;
  company_id: number;
  declaration_type_id: number;
  requested_amount: number;
  reason: string;
  status: string;
  decline_reason: string | null;
  included_in_run: boolean;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  requested: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Pending' },
  approved: { color: 'text-green-700', bg: 'bg-green-100', label: 'Approved' },
  declined: { color: 'text-red-700', bg: 'bg-red-100', label: 'Declined' },
  added_to_run: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'In Run' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Corrections() {
  const { platformUser, isPlacement, isCompany } = usePlatformAuth();
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineFor, setShowDeclineFor] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newCorrection, setNewCorrection] = useState({
    payroll_period_id: 0,
    placement_id: platformUser?.placement_id || 0,
    company_id: platformUser?.company_id || 0,
    declaration_type_id: 1,
    requested_amount: 0,
    reason: '',
  });
  const [periods, setPeriods] = useState<any[]>([]);
  const [decTypes, setDecTypes] = useState<any[]>([]);

  const fetchCorrections = async () => {
    try {
      const params: Record<string, string> = {};
      if (platformUser?.company_id) params.company_id = String(platformUser.company_id);
      if (platformUser?.placement_id) params.placement_id = String(platformUser.placement_id);

      const response = await client.apiCall.invoke({
        url: '/api/v1/payroll/corrections',
        method: 'GET',
        data: params,
      });
      setCorrections(response.data || []);
    } catch (err) {
      console.error('Failed to fetch corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [periodsRes, typesRes] = await Promise.all([
        client.apiCall.invoke({ url: '/api/v1/payroll/periods', method: 'GET' }),
        client.apiCall.invoke({ url: '/api/v1/payroll/declaration-types', method: 'GET' }),
      ]);
      setPeriods(periodsRes.data || []);
      setDecTypes(typesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch form data:', err);
    }
  };

  useEffect(() => {
    fetchCorrections();
    fetchFormData();
  }, [platformUser]);

  const handleCreate = async () => {
    try {
      await client.apiCall.invoke({
        url: '/api/v1/payroll/corrections',
        method: 'POST',
        data: {
          ...newCorrection,
          created_by: String(platformUser?.id || ''),
        },
      });
      setShowCreate(false);
      setNewCorrection({
        payroll_period_id: 0,
        placement_id: platformUser?.placement_id || 0,
        company_id: platformUser?.company_id || 0,
        declaration_type_id: 1,
        requested_amount: 0,
        reason: '',
      });
      await fetchCorrections();
    } catch (err) {
      console.error('Failed to create correction:', err);
    }
  };

  const handleProcess = async (correctionId: number, action: string) => {
    if (action === 'declined' && !declineReason.trim()) return;
    setProcessing(correctionId);
    try {
      await client.apiCall.invoke({
        url: `/api/v1/payroll/corrections/${correctionId}/process`,
        method: 'POST',
        data: {
          action,
          approved_by: String(platformUser?.id || ''),
          decline_reason: action === 'declined' ? declineReason : null,
        },
      });
      setShowDeclineFor(null);
      setDeclineReason('');
      await fetchCorrections();
    } catch (err) {
      console.error('Failed to process correction:', err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <PlatformLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#222c4a]">Correction Requests</h2>
            <p className="text-sm text-gray-500">
              {corrections.filter((c) => c.status === 'requested').length} pending corrections
            </p>
          </div>
          {isPlacement && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-[#407df1] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3568d4] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Correction
            </button>
          )}
        </div>

        {showCreate && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#222c4a]">Submit Correction Request</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={newCorrection.payroll_period_id}
                  onChange={(e) => setNewCorrection({ ...newCorrection, payroll_period_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                >
                  <option value={0}>Select period...</option>
                  {periods.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {MONTHS[p.month - 1]} {p.year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Type</label>
                <select
                  value={newCorrection.declaration_type_id}
                  onChange={(e) => setNewCorrection({ ...newCorrection, declaration_type_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                >
                  {decTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (+/-)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCorrection.requested_amount}
                  onChange={(e) => setNewCorrection({ ...newCorrection, requested_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                  placeholder="e.g. 2 or -1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={newCorrection.reason}
                  onChange={(e) => setNewCorrection({ ...newCorrection, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
                  placeholder="Explain the correction..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!newCorrection.payroll_period_id || !newCorrection.reason}
                className="bg-[#407df1] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#3568d4] disabled:opacity-50"
              >
                Submit
              </button>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : corrections.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No correction requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {corrections.map((corr) => {
              const config = statusConfig[corr.status] || statusConfig.requested;
              return (
                <div key={corr.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center mt-0.5`}>
                        {corr.status === 'approved' ? (
                          <CheckCircle className={`w-5 h-5 ${config.color}`} />
                        ) : corr.status === 'declined' ? (
                          <XCircle className={`w-5 h-5 ${config.color}`} />
                        ) : (
                          <AlertCircle className={`w-5 h-5 ${config.color}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[#222c4a]">
                          Correction #{corr.id} — {corr.requested_amount > 0 ? '+' : ''}{corr.requested_amount}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Period: {corr.payroll_period_id} | Placement: {corr.placement_id} | Type: {corr.declaration_type_id}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{corr.reason}</p>
                        {corr.decline_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            <span className="font-medium">Decline reason:</span> {corr.decline_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  {isCompany && corr.status === 'requested' && (
                    <div className="mt-4 flex items-center gap-3 border-t pt-4">
                      <button
                        onClick={() => handleProcess(corr.id, 'approved')}
                        disabled={processing === corr.id}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      {showDeclineFor === corr.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Reason for decline (required)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-300 outline-none"
                          />
                          <button
                            onClick={() => handleProcess(corr.id, 'declined')}
                            disabled={!declineReason.trim() || processing === corr.id}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setShowDeclineFor(null); setDeclineReason(''); }}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeclineFor(corr.id)}
                          className="flex items-center gap-1.5 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}