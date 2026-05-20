import { useEffect, useState } from 'react';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface ApprovalEntry {
  id: number;
  payroll_period_id: number;
  placement_id: number;
  company_id: number;
  declaration_date: string;
  declaration_type_id: number;
  imported_amount: number;
  status: string;
  approval_stage: string;
  notes: string | null;
}

const stageLabels: Record<string, string> = {
  pending_company_initial: 'Awaiting Company Initial Approval',
  pending_placement: 'Awaiting Placement Approval',
  pending_company_final: 'Awaiting Company Final Approval',
  approved: 'Approved',
  declined: 'Declined',
};

const stageColors: Record<string, string> = {
  pending_company_initial: 'bg-orange-100 text-orange-700 border-orange-200',
  pending_placement: 'bg-blue-100 text-blue-700 border-blue-200',
  pending_company_final: 'bg-purple-100 text-purple-700 border-purple-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
};

export default function Approvals() {
  const { platformUser, isAgency } = usePlatformAuth();
  const [entries, setEntries] = useState<ApprovalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [declineNote, setDeclineNote] = useState('');
  const [showDeclineFor, setShowDeclineFor] = useState<number | null>(null);

  const fetchApprovals = async () => {
    try {
      const params: Record<string, string> = { role: platformUser?.role || '' };
      if (platformUser?.company_id) params.company_id = String(platformUser.company_id);
      if (platformUser?.placement_id) params.placement_id = String(platformUser.placement_id);

      const response = await client.apiCall.invoke({
        url: '/api/v1/payroll/pending-approvals',
        method: 'GET',
        data: params,
      });
      setEntries(response.data || []);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [platformUser]);

  const handleApprove = async (entryId: number) => {
    setProcessing(entryId);
    try {
      await client.apiCall.invoke({
        url: '/api/v1/payroll/approve',
        method: 'POST',
        data: {
          entry_id: entryId,
          approver_id: String(platformUser?.id || ''),
          approver_role: platformUser?.role || '',
          approver_name: platformUser?.name || '',
          action: 'approved',
        },
      });
      await fetchApprovals();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (entryId: number) => {
    if (!declineNote.trim()) return;
    setProcessing(entryId);
    try {
      await client.apiCall.invoke({
        url: '/api/v1/payroll/approve',
        method: 'POST',
        data: {
          entry_id: entryId,
          approver_id: String(platformUser?.id || ''),
          approver_role: platformUser?.role || '',
          approver_name: platformUser?.name || '',
          action: 'declined',
          note: declineNote,
        },
      });
      setShowDeclineFor(null);
      setDeclineNote('');
      await fetchApprovals();
    } catch (err) {
      console.error('Failed to decline:', err);
    } finally {
      setProcessing(null);
    }
  };

  const pendingEntries = entries.filter((e) => e.approval_stage?.includes('pending'));
  const completedEntries = entries.filter((e) => !e.approval_stage?.includes('pending'));

  return (
    <PlatformLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#222c4a]">Approval Queue</h2>
          <p className="text-sm text-gray-500">
            {pendingEntries.length} item{pendingEntries.length !== 1 ? 's' : ''} awaiting your action
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : pendingEntries.length === 0 && completedEntries.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No items in the approval queue</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending */}
            {pendingEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Pending ({pendingEntries.length})
                </h3>
                <div className="space-y-3">
                  {pendingEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium text-[#222c4a]">
                              Entry #{entry.id} — {entry.declaration_date}
                            </p>
                            <p className="text-xs text-gray-500">
                              Amount: {entry.imported_amount} | Placement: {entry.placement_id} | Company: {entry.company_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${stageColors[entry.approval_stage] || ''}`}>
                            {stageLabels[entry.approval_stage] || entry.approval_stage}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isAgency && (
                        <div className="mt-4 flex items-center gap-3 border-t pt-4">
                          <button
                            onClick={() => handleApprove(entry.id)}
                            disabled={processing === entry.id}
                            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          {showDeclineFor === entry.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={declineNote}
                                onChange={(e) => setDeclineNote(e.target.value)}
                                placeholder="Reason for decline (required)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-300 outline-none"
                              />
                              <button
                                onClick={() => handleDecline(entry.id)}
                                disabled={!declineNote.trim() || processing === entry.id}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setShowDeclineFor(null); setDeclineNote(''); }}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowDeclineFor(entry.id)}
                              className="flex items-center gap-1.5 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Completed ({completedEntries.length})
                </h3>
                <div className="space-y-2">
                  {completedEntries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Entry #{entry.id} — {entry.declaration_date} — Amount: {entry.imported_amount}
                        </span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColors[entry.approval_stage] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.approval_stage?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}