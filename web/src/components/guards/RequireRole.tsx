// ════════════════════════════════════════════════════════════
// apps/web/src/components/guards/RequireRole.tsx
// ════════════════════════════════════════════════════════════
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore }     from '../../store/auth.store'

interface Props { roles: string[] }

export default function RequireRole({ roles }: Props) {
  const { user } = useAuthStore()
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}