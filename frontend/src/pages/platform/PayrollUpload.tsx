import { useState, useRef } from 'react';
import PlatformLayout from '@/components/PlatformLayout';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { useEffect } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ImportResult {
  imported: number;
  errors: string[];
  total_rows: number;
}

export default function PayrollUpload() {
  const { platformUser } = usePlatformAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await client.apiCall.invoke({
          url: '/api/v1/payroll/periods',
          method: 'GET',
        });
        setPeriods(response.data || []);
      } catch (err) {
        console.error('Failed to fetch periods:', err);
      }
    };
    fetchPeriods();
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedPeriodId) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('period_id', String(selectedPeriodId));

      const response = await client.apiCall.invoke({
        url: '/api/v1/payroll/upload',
        method: 'POST',
        data: formData,
        options: {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      });
      setResult(response.data);
    } catch (err: any) {
      setResult({
        imported: 0,
        errors: [err?.data?.detail || err?.message || 'Upload failed'],
        total_rows: 0,
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'placement_id,company_id,date,declaration_type_code,amount\n1,1,2026-04-01,HOURS,8\n1,1,2026-04-01,OVERTIME,2\n1,1,2026-04-02,HOURS,8\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'declaration_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PlatformLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#222c4a]">Upload Declarations</h2>
          <p className="text-sm text-gray-500">Import declaration entries from a CSV file</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-[#222c4a] mb-4">CSV Format</h3>
          <p className="text-sm text-gray-600 mb-3">
            Your CSV file should contain the following columns:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-700 mb-4 overflow-x-auto">
            <div className="font-bold">placement_id,company_id,date,declaration_type_code,amount</div>
            <div>1,1,2026-04-01,HOURS,8</div>
            <div>1,1,2026-04-01,OVERTIME,2</div>
            <div>1,1,2026-04-02,HOURS,8</div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Valid declaration type codes: HOURS, OVERTIME, EXPENSES, TRAVEL, OTHER
          </p>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-[#407df1] hover:text-[#3568d4] font-medium"
          >
            <Download className="w-4 h-4" />
            Download Template CSV
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payroll Period</label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#407df1] outline-none"
              >
                <option value={0}>Select period...</option>
                {periods.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {MONTHS[p.month - 1]} {p.year} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#407df1] hover:bg-[#407df1]/5 transition-all"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-[#407df1]" />
                    <div className="text-left">
                      <p className="font-medium text-[#222c4a]">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Click to select a CSV file</p>
                    <p className="text-xs text-gray-400 mt-1">Only .csv files are supported</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !selectedPeriodId || uploading}
              className="w-full bg-[#407df1] text-white py-3 rounded-lg font-semibold hover:bg-[#3568d4] disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload and Import'}
            </button>
          </div>
        </div>

        {result && (
          <div className={`mt-6 rounded-xl p-6 shadow-sm border ${
            result.errors.length === 0
              ? 'bg-green-50 border-green-200'
              : result.imported > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.errors.length === 0 ? (
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-[#222c4a]">Import Results</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Successfully imported: <span className="font-bold text-green-700">{result.imported}</span> entries
                  {result.total_rows > 0 && ` out of ${result.total_rows} rows`}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-700 mb-1">Errors ({result.errors.length}):</p>
                    <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="bg-red-100/50 px-2 py-1 rounded">{err}</li>
                      ))}
                    </ul>
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