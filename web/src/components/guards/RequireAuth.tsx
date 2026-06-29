// ════════════════════════════════════════════════════════════
// apps/web/src/components/guards/RequireAuth.tsx
// ════════════════════════════════════════════════════════════
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore }                  from '../../store/auth.store'

export default function RequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const location            = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}