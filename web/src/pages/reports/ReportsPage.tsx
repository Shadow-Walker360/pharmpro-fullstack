import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from 'recharts';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Button, Select, Card, Spinner, EmptyState, Badge } from '../components/ui';
import { toast } from '../components/ui/toast';

// ── Report catalog ──────────────────────────────────────────────────────────
type ReportType =
  | 'SALES_SUMMARY'
  | 'PROFIT_MARGIN'
  | 'INVENTORY_TURNOVER'
  | 'PRESCRIPTION_VOLUME'
  | 'INSURANCE_CLAIMS'
  | 'EXPIRY_WASTE';

const REPORT_CATALOG: { id: ReportType; title: string; description: string }[] = [
  { id: 'SALES_SUMMARY', title: 'Sales Summary', description: 'Revenue, transaction count, and average basket by day, week, or month.' },
  { id: 'PROFIT_MARGIN', title: 'Profit Margin', description: 'Cost vs. revenue per drug category, surfacing your highest and lowest margin lines.' },
  { id: 'INVENTORY_TURNOVER', title: 'Inventory Turnover', description: 'Stock movement velocity — identifies dead stock and fast movers (ABC analysis).' },
  { id: 'PRESCRIPTION_VOLUME', title: 'Prescription Volume', description: 'Rx filled by pharmacist, by drug, and by urgency over time.' },
  { id: 'INSURANCE_CLAIMS', title: 'Insurance Claims', description: 'Claims submitted, approved, rejected, and outstanding by payer (NHIF, AAR, UAP…).' },
  { id: 'EXPIRY_WASTE', title: 'Expiry & Waste', description: 'Value of stock written off due to expiry — your single biggest avoidable loss.' },
];

interface TrendPoint {
  date: string;
  revenue: number;
  cogs: number;
  prescriptions: number;
}

// ── Hooks ───────────────────────────────────────────────────────────────────
function useTrend(days: number) {
  return useQuery({
    queryKey: ['reports-trend', days],
    queryFn: async () => (await api.get<{ data: TrendPoint[] }>(`/api/reports/trend?days=${days}`)).data.data,
    staleTime: 5 * 60_000,
  });
}

function useReportPreview(type: ReportType | null, range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['report-preview', type, range],
    queryFn: async () =>
      (await api.get(`/api/reports/${type}?from=${range.from}&to=${range.to}`)).data,
    enabled: !!type,
  });
}

async function exportReport(type: ReportType, format: 'pdf' | 'csv' | 'xlsx', range: { from: string; to: string }) {
  const res = await api.get(`/api/reports/${type}/export?format=${format}&from=${range.from}&to=${range.to}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type.toLowerCase()}-${range.from}-to-${range.to}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuthStore();
  const [days, setDays] = useState(30);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [range, setRange] = useState(() => defaultRange());

  const { data: trend, isLoading: trendLoading } = useTrend(days);
  const { data: preview, isLoading: previewLoading } = useReportPreview(activeReport, range);

  const canExport = user?.role === 'SUPER_ADMIN' || user?.role === 'PHARMACIST' || user?.role === 'ACCOUNTANT';

  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!activeReport) return;
    try {
      await exportReport(activeReport, format, range);
      toast.success(`Export queued — ${format.toUpperCase()} will download shortly.`);
    } catch {
      toast.error('Export failed. Try again or check your connection.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Business intelligence across sales, inventory, prescriptions, and claims.</p>
      </div>

      {/* Trend overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Revenue vs. COGS Trend</h2>
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        </div>
        {trendLoading ? (
          <Spinner />
        ) : !trend?.length ? (
          <EmptyState title="No sales data yet for this period" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `KES ${v.toLocaleString('en-KE')}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} name="Revenue" dot={false} />
              <Line type="monotone" dataKey="cogs" stroke="#dc2626" strokeWidth={2} name="COGS" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Report catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_CATALOG.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`text-left rounded-xl border p-4 transition hover:shadow-md ${
              activeReport === r.id ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50' : 'border-slate-200 bg-white'
            }`}
          >
            <h3 className="font-semibold text-slate-900">{r.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{r.description}</p>
          </button>
        ))}
      </div>

      {/* Active report preview */}
      {activeReport && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">
                {REPORT_CATALOG.find((r) => r.id === activeReport)?.title}
              </h2>
              <Badge variant="slate">{range.from} → {range.to}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
              />
              {canExport && (
                <div className="flex gap-1 ml-2">
                  <Button size="sm" variant="ghost" onClick={() => handleExport('csv')}>CSV</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleExport('xlsx')}>Excel</Button>
                  <Button size="sm" onClick={() => handleExport('pdf')}>Export PDF</Button>
                </div>
              )}
            </div>
          </div>

          {previewLoading ? (
            <Spinner />
          ) : !preview?.rows?.length ? (
            <EmptyState title="No data for this report and date range" />
          ) : (
            <ReportPreviewTable report={preview} />
          )}
        </Card>
      )}
    </div>
  );
}

function ReportPreviewTable({ report }: { report: { columns: string[]; rows: Record<string, unknown>[] } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {report.columns.map((c) => <th key={c} className="py-2 pr-4 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {report.rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              {report.columns.map((c) => (
                <td key={c} className="py-2 pr-4 text-slate-700">{String(row[c] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {report.rows.length > 50 && (
        <p className="text-xs text-slate-400 mt-2">Showing first 50 of {report.rows.length} rows — export for the full set.</p>
      )}
    </div>
  );
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}
