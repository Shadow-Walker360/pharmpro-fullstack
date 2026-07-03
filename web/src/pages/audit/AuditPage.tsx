import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Input, Select, Badge, Table, EmptyState, Spinner, Button, Tabs, TabPanel } from '../components/ui';

// ── Types ───────────────────────────────────────────────────────────────────
interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;          // CREATE | UPDATE | DELETE | DISPENSE | OVERRIDE | LOGIN | LOGOUT...
  tableName: string;
  recordId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

interface ReadAuditEntry {
  id: string;
  userId: string;
  userName: string;
  patientId: string;
  patientName: string;
  ipAddress: string;
  device: string | null;
  createdAt: string;
}

interface AuditFilters {
  action: string;
  tableName: string;
  userId: string;
  from: string;
  to: string;
}

const ACTION_VARIANT: Record<string, 'green' | 'blue' | 'red' | 'amber' | 'slate' | 'purple'> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  DISPENSE: 'purple',
  OVERRIDE: 'amber',
  LOGIN: 'slate',
  LOGOUT: 'slate',
};

// ── Hooks ───────────────────────────────────────────────────────────────────
function useAuditLog(filters: AuditFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: '25', ...stripEmpty(filters) });
  return useQuery({
    queryKey: ['audit-log', filters, page],
    queryFn: async () => (await api.get<{ data: AuditLogEntry[]; total: number; pages: number }>(`/api/audit?${params}`)).data,
    placeholderData: (prev) => prev,
  });
}

function useReadAuditLog(page: number) {
  return useQuery({
    queryKey: ['read-audit-log', page],
    queryFn: async () =>
      (await api.get<{ data: ReadAuditEntry[]; total: number; pages: number }>(`/api/audit/reads?page=${page}&limit=25`)).data,
    placeholderData: (prev) => prev,
  });
}

function stripEmpty(obj: Record<string, string>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ''));
}

// ── Component ───────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'changes' | 'reads'>('changes');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({ action: '', tableName: '', userId: '', from: '', to: '' });

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'PHARMACIST') {
    return (
      <EmptyState
        title="Restricted area"
        description="Audit trails are visible to Super Admins and Pharmacists only — this includes record reads, which are the most common source of healthcare privacy breaches."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-500">
          Immutable log of every write and every patient-record view across the system.
        </p>
      </div>

      <Tabs value={tab} onChange={(v) => { setTab(v as 'changes' | 'reads'); setPage(1); }}>
        <TabPanel value="changes" label="Write log">
          <ChangeLogTable filters={filters} setFilters={setFilters} page={page} setPage={setPage} />
        </TabPanel>
        <TabPanel value="reads" label="Patient record views">
          <ReadLogTable page={page} setPage={setPage} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function ChangeLogTable({
  filters,
  setFilters,
  page,
  setPage,
}: {
  filters: AuditFilters;
  setFilters: (f: AuditFilters) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  const { data, isLoading } = useAuditLog(filters, page);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.action}
          onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
        >
          <option value="">All actions</option>
          {Object.keys(ACTION_VARIANT).map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Input
          placeholder="Table name (e.g. prescription)"
          value={filters.tableName}
          onChange={(e) => { setFilters({ ...filters, tableName: e.target.value }); setPage(1); }}
          className="max-w-xs"
        />
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <EmptyState title="No matching audit entries" description="Try widening your filters." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Table / Record</th>
                <th>IP</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.map((entry) => (
                <>
                  <tr key={entry.id} className="cursor-pointer" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                    <td className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString('en-KE')}
                    </td>
                    <td className="font-medium">{entry.userName}</td>
                    <td><Badge variant={ACTION_VARIANT[entry.action] ?? 'slate'}>{entry.action}</Badge></td>
                    <td className="text-sm text-slate-500">{entry.tableName} · {entry.recordId.slice(0, 8)}</td>
                    <td className="text-sm text-slate-400">{entry.ipAddress}</td>
                    <td className="text-right text-slate-400">{expanded === entry.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-detail`}>
                      <td colSpan={6} className="bg-slate-50 p-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-slate-600 mb-1">Before</p>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-48">
                              {entry.oldValue ? JSON.stringify(entry.oldValue, null, 2) : '— (new record)'}
                            </pre>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-600 mb-1">After</p>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-48">
                              {entry.newValue ? JSON.stringify(entry.newValue, null, 2) : '— (deleted)'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function ReadLogTable({ page, setPage }: { page: number; setPage: (p: number) => void }) {
  const { data, isLoading } = useReadAuditLog(page);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <EmptyState title="No record views logged yet" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Staff member</th>
                <th>Patient viewed</th>
                <th>Device</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-sm text-slate-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString('en-KE')}
                  </td>
                  <td className="font-medium">{entry.userName}</td>
                  <td>{entry.patientName}</td>
                  <td className="text-sm text-slate-500">{entry.device ?? '—'}</td>
                  <td className="text-sm text-slate-400">{entry.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex justify-center gap-2 pt-2">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-sm text-slate-500 self-center">Page {page} of {pages}</span>
      <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}
