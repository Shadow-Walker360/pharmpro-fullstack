import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Select, Card, Toggle, EmptyState, Spinner } from '../components/ui';
import { toast } from '../components/ui/toast';

interface BranchSettings {
  pharmacyName: string;
  ppbLicenseNo: string;
  kraPin: string;
  address: string;
  phone: string;
  vatRate: number;          // e.g. 0.16
  vatEnabled: boolean;
  lowStockThreshold: number;
  expiryWarningDays: number;
  currency: string;         // KES
  receiptFooterNote: string;
  notifyLowStock: boolean;
  notifyExpiry: boolean;
  notifyRefillDue: boolean;
  smsProvider: 'AFRICAS_TALKING' | 'NONE';
  mpesaShortcode: string;
  mpesaEnvironment: 'SANDBOX' | 'PRODUCTION';
}

const TAB_KEYS = ['general', 'tax', 'inventory', 'notifications', 'mpesa'] as const;
type TabKey = typeof TAB_KEYS[number];

const TAB_LABELS: Record<TabKey, string> = {
  general: 'General',
  tax: 'Tax & Compliance',
  inventory: 'Stock Thresholds',
  notifications: 'Notifications',
  mpesa: 'M-Pesa Integration',
};

// ── Hooks ───────────────────────────────────────────────────────────────────
function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<{ data: BranchSettings }>('/api/settings')).data.data,
  });
}

function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BranchSettings>) => api.patch('/api/settings', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });
}

// ── Component ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  // Tab state persisted in the URL so a refresh / shared link keeps you on the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'general');

  const [form, setForm] = useState<BranchSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const changeTab = (t: TabKey) => {
    setTab(t);
    setSearchParams({ tab: t });
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <EmptyState
        title="Restricted area"
        description="Only Super Admins can change pharmacy-wide configuration."
      />
    );
  }

  if (isLoading || !form) return <Spinner />;

  const set = <K extends keyof BranchSettings>(key: K, value: BranchSettings[K]) =>
    setForm({ ...form, [key]: value });

  const handleSave = () => {
    if (!form.pharmacyName.trim()) return toast.error('Pharmacy name is required.');
    if (form.vatEnabled && (form.vatRate < 0 || form.vatRate > 1)) return toast.error('VAT rate must be between 0 and 1 (e.g. 0.16 for 16%).');
    updateSettings.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configuration applies to this branch only.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TAB_KEYS.map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'general' && (
          <div className="space-y-4">
            <Input label="Pharmacy name" value={form.pharmacyName} onChange={(e) => set('pharmacyName', e.target.value)} />
            <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Select label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="TZS">TZS — Tanzanian Shilling</option>
            </Select>
            <Input
              label="Receipt footer note"
              value={form.receiptFooterNote}
              onChange={(e) => set('receiptFooterNote', e.target.value)}
              hint='e.g. "Goods sold are not returnable without a receipt."'
            />
          </div>
        )}

        {tab === 'tax' && (
          <div className="space-y-4">
            <Input
              label="PPB license number"
              value={form.ppbLicenseNo}
              onChange={(e) => set('ppbLicenseNo', e.target.value)}
              hint="Pharmacy and Poisons Board license — printed on every receipt."
            />
            <Input label="KRA PIN" value={form.kraPin} onChange={(e) => set('kraPin', e.target.value)} />
            <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
              <div>
                <p className="font-medium text-slate-800">Enable VAT</p>
                <p className="text-sm text-slate-500">Applies VAT to taxable line items at point of sale.</p>
              </div>
              <Toggle checked={form.vatEnabled} onChange={(v) => set('vatEnabled', v)} />
            </div>
            {form.vatEnabled && (
              <Input
                label="VAT rate"
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={form.vatRate}
                onChange={(e) => set('vatRate', Number(e.target.value))}
                hint="Kenyan standard rate is 0.16 (16%). Most prescription medicines are zero-rated — confirm per item."
              />
            )}
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-4">
            <Input
              label="Low stock threshold (units)"
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => set('lowStockThreshold', Number(e.target.value))}
              hint="Drugs at or below this quantity trigger a low-stock alert."
            />
            <Input
              label="Expiry warning window (days)"
              type="number"
              min={1}
              value={form.expiryWarningDays}
              onChange={(e) => set('expiryWarningDays', Number(e.target.value))}
              hint="Batches expiring within this window appear on the Expiring Soon list."
            />
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            <ToggleRow
              label="Low stock alerts"
              description="Notify Inventory Manager and Pharmacist when stock crosses the threshold."
              checked={form.notifyLowStock}
              onChange={(v) => set('notifyLowStock', v)}
            />
            <ToggleRow
              label="Expiry alerts"
              description="Notify staff when a batch enters the expiry warning window."
              checked={form.notifyExpiry}
              onChange={(v) => set('notifyExpiry', v)}
            />
            <ToggleRow
              label="Refill due reminders"
              description="SMS patients automatically when a refill becomes eligible."
              checked={form.notifyRefillDue}
              onChange={(v) => set('notifyRefillDue', v)}
            />
            <Select
              label="SMS provider"
              value={form.smsProvider}
              onChange={(e) => set('smsProvider', e.target.value as BranchSettings['smsProvider'])}
            >
              <option value="AFRICAS_TALKING">Africa's Talking</option>
              <option value="NONE">Disabled — no SMS provider configured</option>
            </Select>
          </div>
        )}

        {tab === 'mpesa' && (
          <div className="space-y-4">
            <Input label="M-Pesa Till / Paybill shortcode" value={form.mpesaShortcode} onChange={(e) => set('mpesaShortcode', e.target.value)} />
            <Select
              label="Environment"
              value={form.mpesaEnvironment}
              onChange={(e) => set('mpesaEnvironment', e.target.value as BranchSettings['mpesaEnvironment'])}
            >
              <option value="SANDBOX">Sandbox (testing)</option>
              <option value="PRODUCTION">Production (live transactions)</option>
            </Select>
            {form.mpesaEnvironment === 'PRODUCTION' && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                You're configuring live M-Pesa. Daraja consumer key/secret and passkey are managed in server
                environment variables, not here, for security — contact your engineer to rotate them.
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setForm(settings!)} disabled={updateSettings.isPending}>
          Discard changes
        </Button>
        <Button onClick={handleSave} loading={updateSettings.isPending}>Save changes</Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
      <div>
        <p className="font-medium text-slate-800">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
