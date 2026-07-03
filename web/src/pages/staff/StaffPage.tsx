import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Select, Modal, Badge, Table, EmptyState, Spinner } from '../components/ui';
import { toast } from '../components/ui/toast';

// ── Types ───────────────────────────────────────────────────────────────────
type StaffRole = 'SUPER_ADMIN' | 'PHARMACIST' | 'TECHNICIAN' | 'CASHIER' | 'INVENTORY_MANAGER' | 'ACCOUNTANT' | 'DELIVERY';

interface StaffMember {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  branchId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  PHARMACIST: 'Pharmacist',
  TECHNICIAN: 'Pharmacy Technician',
  CASHIER: 'Cashier',
  INVENTORY_MANAGER: 'Inventory Manager',
  ACCOUNTANT: 'Accountant',
  DELIVERY: 'Delivery Personnel',
};

const ROLE_BADGE_VARIANT: Record<StaffRole, 'purple' | 'blue' | 'teal' | 'amber' | 'slate' | 'green' | 'gray'> = {
  SUPER_ADMIN: 'purple',
  PHARMACIST: 'blue',
  TECHNICIAN: 'teal',
  CASHIER: 'amber',
  INVENTORY_MANAGER: 'slate',
  ACCOUNTANT: 'green',
  DELIVERY: 'gray',
};

// ── Hooks ───────────────────────────────────────────────────────────────────
function useStaff(branchId: string) {
  return useQuery({
    queryKey: ['staff', branchId],
    queryFn: async () => (await api.get<{ data: StaffMember[] }>(`/api/staff?branchId=${branchId}`)).data.data,
    staleTime: 60_000,
  });
}

function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<StaffMember> & { password: string }) => api.post('/api/staff', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff account created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create staff account'),
  });
}

function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) => api.patch(`/api/staff/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role — check your own RBAC permissions'),
  });
}

function useToggleStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/staff/${id}/status`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff status updated');
    },
  });
}

// ── Component ───────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { user, branchId } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: staff, isLoading } = useStaff(branchId);
  const createStaff = useCreateStaff();
  const updateRole = useUpdateStaffRole();
  const toggleActive = useToggleStaffActive();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoleFor, setEditingRoleFor] = useState<StaffMember | null>(null);

  const filtered = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.phone ?? '').includes(search);
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staff, search, roleFilter]);

  if (!isSuperAdmin && user?.role !== 'PHARMACIST') {
    return (
      <EmptyState
        title="Restricted area"
        description="Only Super Admins and Pharmacists can manage staff accounts and roles."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff & Roles</h1>
          <p className="text-sm text-slate-500">Manage accounts, RBAC permissions, and activity for this branch.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>+ New Staff Account</Button>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as StaffRole | 'ALL')}>
          <option value="ALL">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No staff found" description="Try adjusting your search or filters." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Last login</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-900">{s.fullName}</td>
                <td className="text-sm text-slate-500">
                  {s.email ?? '—'}<br />
                  {s.phone ?? '—'}
                </td>
                <td>
                  <Badge variant={ROLE_BADGE_VARIANT[s.role]}>{ROLE_LABELS[s.role]}</Badge>
                </td>
                <td className="text-sm text-slate-500">
                  {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('en-KE') : 'Never logged in'}
                </td>
                <td>
                  <Badge variant={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Suspended'}</Badge>
                </td>
                <td className="text-right space-x-2">
                  {isSuperAdmin && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRoleFor(s)}>
                        Change role
                      </Button>
                      <Button
                        size="sm"
                        variant={s.isActive ? 'danger-ghost' : 'ghost'}
                        onClick={() => toggleActive.mutate({ id: s.id, isActive: !s.isActive })}
                        disabled={s.id === user?.id}
                        title={s.id === user?.id ? "You can't suspend your own account" : undefined}
                      >
                        {s.isActive ? 'Suspend' : 'Reactivate'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreateModal && (
        <CreateStaffModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(payload) => {
            createStaff.mutate(payload, { onSuccess: () => setShowCreateModal(false) });
          }}
          isSubmitting={createStaff.isPending}
        />
      )}

      {editingRoleFor && (
        <ChangeRoleModal
          staff={editingRoleFor}
          onClose={() => setEditingRoleFor(null)}
          onSubmit={(role) => {
            updateRole.mutate({ id: editingRoleFor.id, role }, { onSuccess: () => setEditingRoleFor(null) });
          }}
          isSubmitting={updateRole.isPending}
        />
      )}
    </div>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────
function CreateStaffModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (payload: Partial<StaffMember> & { password: string }) => void;
  isSubmitting: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Africa-first: at least one of email or phone is required, not both.
  const handleSubmit = () => {
    if (!fullName.trim()) return setError('Full name is required.');
    if (!email.trim() && !phone.trim()) return setError('Provide at least an email or a phone number.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    onSubmit({
      fullName: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      role,
      password,
    } as any);
  };

  return (
    <Modal title="New Staff Account" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" />
        </div>
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Input
          label="Temporary password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Staff member will be prompted to change this on first login."
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>Create account</Button>
        </div>
      </div>
    </Modal>
  );
}

function ChangeRoleModal({
  staff,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  staff: StaffMember;
  onClose: () => void;
  onSubmit: (role: StaffRole) => void;
  isSubmitting: boolean;
}) {
  const [role, setRole] = useState<StaffRole>(staff.role);
  return (
    <Modal title={`Change role — ${staff.fullName}`} onClose={onClose}>
      <div className="space-y-3">
        <Select label="New role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <p className="text-xs text-slate-500">
          This change is written to the immutable audit log with your user ID and timestamp.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(role)} loading={isSubmitting} disabled={role === staff.role}>
            Save role
          </Button>
        </div>
      </div>
    </Modal>
  );
}
