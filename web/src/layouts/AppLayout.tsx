// ════════════════════════════════════════════════════════════
// apps/web/src/layouts/AppLayout.tsx
// Main shell — sidebar + topbar + content + socket listener
// ════════════════════════════════════════════════════════════
import { Outlet }          from 'react-router-dom'
import { useEffect }       from 'react'
import Sidebar             from '../components/layouts/Sidebar'
import Topbar              from '../components/layouts/Topbar'
import { getSocket }       from '../lib/socket'
import { useAuthStore }    from '../store/auth.store'
import { queryClient }     from '../lib/queryClient'
import toast               from 'react-hot-toast'

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return

    const socket = getSocket()

    // ── Real-time event handlers ──────────────────────────
    socket.on('queue:updated', () => {
      // Invalidate prescription queue cache
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'queue-stats'] })
    })

    socket.on('sale:completed', (data: any) => {
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['sales', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    })

    socket.on('inventory:low-stock', (data: any) => {
      toast.error(`Low stock: ${data.drugId} — only ${data.qty} units left`, {
        duration: 8000,
      })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    })

    socket.on('inventory:expiry-alert', (data: any) => {
      toast(`⚠ Expiry alert: ${data.drugName} — ${data.daysLeft} days (${data.qty} units)`, {
        duration: 10000,
        icon:     '⚠️',
      })
    })

    socket.on('mpesa:confirmed', (data: any) => {
      toast.success(`M-Pesa confirmed: KES ${data.amount} — ${data.receiptNo}`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    })

    return () => {
      socket.off('queue:updated')
      socket.off('sale:completed')
      socket.off('inventory:low-stock')
      socket.off('inventory:expiry-alert')
      socket.off('mpesa:confirmed')
    }
  }, [isAuthenticated])

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}