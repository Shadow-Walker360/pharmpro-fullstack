// ════════════════════════════════════════════════════════════
// apps/web/src/layouts/AuthLayout.tsx
// ════════════════════════════════════════════════════════════
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore }     from '../store/auth.store'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      {/* Animated background mesh */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <Outlet />
    </div>
  )
}