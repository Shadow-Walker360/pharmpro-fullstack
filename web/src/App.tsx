// ════════════════════════════════════════════════════════════
// apps/web/src/App.tsx
// ════════════════════════════════════════════════════════════
import { useEffect }       from 'react'
import { Routes, Route }   from 'react-router-dom'
import { useAuthStore }    from './store/auth.store'
import AppLayout           from './layouts/AppLayout'
import AuthLayout          from './layouts/AuthLayout'
import RequireAuth         from './components/guards/RequireAuth'
import RequireRole         from './components/guards/RequireRole'
import FullPageSpinner     from './components/ui/FullPageSpinner'

// Pages — lazy loaded for fast initial bundle
import { lazy, Suspense }  from 'react'

const LoginPage           = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage       = lazy(() => import('./pages/dashboard/DashboardPage'))
const POSPage             = lazy(() => import('./pages/pos/POSPage'))
const SalesPage           = lazy(() => import('./pages/sales/SalesPage'))
const SaleDetailPage      = lazy(() => import('./pages/sales/SaleDetailPage'))
const PrescriptionsPage   = lazy(() => import('./pages/prescriptions/PrescriptionsPage'))
const PrescriptionDetail  = lazy(() => import('./pages/prescriptions/PrescriptionDetail'))
const NewPrescriptionPage = lazy(() => import('./pages/prescriptions/NewPrescriptionPage'))
const PatientsPage        = lazy(() => import('./pages/patients/PatientsPage'))
const PatientProfilePage  = lazy(() => import('./pages/patients/PatientProfilePage'))
const DrugsPage           = lazy(() => import('./pages/drugs/DrugsPage'))
const InventoryPage       = lazy(() => import('./pages/inventory/InventoryPage'))
const SuppliersPage       = lazy(() => import('./pages/purchases/SuppliersPage'))
const PurchasesPage       = lazy(() => import('./pages/purchases/PurchasesPage'))
const PurchaseDetailPage  = lazy(() => import('./pages/purchases/PurchaseDetailPage'))
const FinancePage         = lazy(() => import('./pages/finance/FinancePage'))
const InsurancePage       = lazy(() => import('./pages/insurance/InsurancePage'))
const StaffPage           = lazy(() => import('./pages/staff/StaffPage'))
const AuditPage           = lazy(() => import('./pages/audit/AuditPage'))
const ReportsPage         = lazy(() => import('./pages/reports/ReportsPage'))
const SettingsPage        = lazy(() => import('./pages/settings/SettingsPage'))
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  const { hydrate, isLoading } = useAuthStore()

  // Hydrate session from cookie on app load
  useEffect(() => { hydrate() }, [])

  if (isLoading) return <FullPageSpinner />

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>

        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index                      element={<DashboardPage />} />
            <Route path="dashboard"           element={<DashboardPage />} />

            {/* POS */}
            <Route path="pos"                 element={<POSPage />} />

            {/* Sales */}
            <Route path="sales"               element={<SalesPage />} />
            <Route path="sales/:id"           element={<SaleDetailPage />} />

            {/* Prescriptions */}
            <Route path="prescriptions"           element={<PrescriptionsPage />} />
            <Route path="prescriptions/new"       element={<NewPrescriptionPage />} />
            <Route path="prescriptions/:id"       element={<PrescriptionDetail />} />

            {/* Patients */}
            <Route path="patients"            element={<PatientsPage />} />
            <Route path="patients/:id"        element={<PatientProfilePage />} />

            {/* Clinical */}
            <Route path="drugs"               element={<DrugsPage />} />

            {/* Inventory */}
            <Route path="inventory"           element={<InventoryPage />} />

            {/* Purchasing */}
            <Route path="suppliers"           element={<SuppliersPage />} />
            <Route path="purchases"           element={<PurchasesPage />} />
            <Route path="purchases/:id"       element={<PurchaseDetailPage />} />

            {/* Finance — restricted to finance roles */}
            <Route element={<RequireRole roles={['SUPER_ADMIN','PHARMACIST','ACCOUNTANT','STORE_MANAGER']} />}>
              <Route path="finance"           element={<FinancePage />} />
              <Route path="insurance"         element={<InsurancePage />} />
              <Route path="reports"           element={<ReportsPage />} />
            </Route>

            {/* Admin only */}
            <Route element={<RequireRole roles={['SUPER_ADMIN','PHARMACIST']} />}>
              <Route path="staff"             element={<StaffPage />} />
              <Route path="audit"             element={<AuditPage />} />
            </Route>

            <Route path="settings"            element={<SettingsPage />} />
            <Route path="*"                   element={<NotFoundPage />} />
          </Route>
        </Route>

      </Routes>
    </Suspense>
  )
}











