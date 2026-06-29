// ════════════════════════════════════════════════════════════
// apps/web/src/components/layout/Topbar.tsx
// ════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { useNavigate }                 from 'react-router-dom'
import {
  Search, Bell, Maximize2, Minimize2, ScanLine,
}                                      from 'lucide-react'
import { clsx }                        from 'clsx'
import { useAuthStore }                from '../../store/auth.store'
import { Badge }                       from '../ui/Badge'

const ROUTE_MAP: Record<string, string> = {
  prescriptions:'prescriptions', prescription:'prescriptions',
  patients:'patients', patient:'patients',
  inventory:'inventory', stock:'inventory',
  sales:'sales', sale:'sales',
  finance:'finance',
  drugs:'drugs', drug:'drugs',
  purchases:'purchases', purchase:'purchases',
  audit:'audit', reports:'reports',
  insurance:'insurance', staff:'staff', settings:'settings',
  pos:'pos',
}

export default function Topbar() {
  const [q,          setQ]          = useState('')
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const navigate                    = useNavigate()
  const { user }                    = useAuthStore()
  const notifRef                    = useRef<HTMLDivElement>(null)

  // Close notif on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const lq = q.toLowerCase().trim()
    if (!lq) return
    const match = Object.entries(ROUTE_MAP).find(([k]) => lq.includes(k))
    if (match) navigate(`/${match[1]}`)
    setQ('')
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  // Get page title from pathname
  const pathLabel: Record<string, string> = {
    '/': 'Dashboard', '/dashboard': 'Dashboard', '/pos': 'Point of Sale',
    '/sales': 'Sales History', '/prescriptions': 'Prescriptions',
    '/patients': 'Patients', '/drugs': 'Drug Database', '/inventory': 'Inventory',
    '/suppliers': 'Suppliers', '/purchases': 'Purchase Orders',
    '/finance': 'Finance', '/insurance': 'Insurance', '/reports': 'Reports',
    '/staff': 'Staff & Roles', '/audit': 'Audit Log', '/settings': 'Settings',
  }
  const title = pathLabel[window.location.pathname] ?? 'PharmPro'

  return (
    <header className="h-14 bg-bg2/90 backdrop-blur-glass border-b border-border
                       flex items-center px-5 gap-3 flex-shrink-0 z-10">
      {/* Page title */}
      <h1 className="text-base font-extrabold text-text tracking-tight flex-1">
        {title}
      </h1>

      {/* Global search */}
      <form onSubmit={handleSearch}
        className="flex items-center gap-2 bg-surface border border-border rounded-2xl
                   px-3 py-2 w-64 focus-within:border-blue focus-within:ring-2
                   focus-within:ring-blue/20 transition-all">
        <Search size={14} className="text-text3 flex-shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search anything…"
          className="bg-transparent border-none outline-none text-sm text-text
                     placeholder:text-text3 w-full"
        />
        <kbd className="hidden sm:inline-flex text-xs text-text3 border border-border
                        rounded px-1 py-0.5">⌘K</kbd>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Barcode scanner button */}
        <button
          onClick={() => navigate('/pos')}
          className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center
                     justify-center text-text2 hover:bg-bg4 hover:text-text transition-all"
          title="POS / Scanner"
        >
          <ScanLine size={16} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center
                       justify-center text-text2 hover:bg-bg4 hover:text-text transition-all
                       relative"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red rounded-full
                             border-2 border-bg2" />
          </button>

          {notifOpen && (
            <div className="absolute top-11 right-0 w-80 glass-card z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-bold">Notifications</span>
                <Badge variant="info">8 new</Badge>
              </div>
              {[
                { type:'danger',  title:'Low stock — Amoxicillin 500mg', sub:'12 units · reorder level 50',    time:'2 min ago', route:'/inventory' },
                { type:'info',    title:'New Rx — Fatuma Ali',           sub:'Metformin 850mg × 60',           time:'15 min ago',route:'/prescriptions' },
                { type:'warning', title:'Expiry warning',                sub:'Metronidazole MET-09 — 18 days', time:'1 hr ago',  route:'/inventory' },
                { type:'success', title:'PO-2024-089 received',          sub:'48 items from Medisel',          time:'3 hrs ago', route:'/purchases' },
              ].map((n, i) => (
                <div
                  key={i}
                  onClick={() => { navigate(n.route); setNotifOpen(false) }}
                  className="px-4 py-3 border-b border-border/50 last:border-none
                             hover:bg-surface cursor-pointer transition-colors"
                >
                  <p className={clsx('text-xs font-bold', {
                    'text-red':   n.type==='danger',
                    'text-blue':  n.type==='info',
                    'text-amber': n.type==='warning',
                    'text-green': n.type==='success',
                  })}>{n.title}</p>
                  <p className="text-xs text-text2 mt-0.5">{n.sub}</p>
                  <p className="text-xs text-text3 mt-1">{n.time}</p>
                </div>
              ))}
              <div className="px-4 py-2.5 text-center">
                <button
                  className="text-xs text-blue hover:underline"
                  onClick={() => setNotifOpen(false)}
                >
                  Mark all read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center
                     justify-center text-text2 hover:bg-bg4 hover:text-text transition-all"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Branch badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg
                        bg-blue-lt border border-blue/20 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <span className="text-xs font-bold text-blue truncate max-w-[100px]">
            {user?.branch?.name ?? 'PharmPro'}
          </span>
        </div>
      </div>
    </header>
  )
}