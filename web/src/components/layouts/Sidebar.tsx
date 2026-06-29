// ════════════════════════════════════════════════════════════
// apps/web/src/components/layout/Sidebar.tsx
// ════════════════════════════════════════════════════════════
import { NavLink, useNavigate }  from 'react-router-dom'
import { clsx }                  from 'clsx'
import { useAuthStore }          from '../../store/auth.store'
import { useQueueStats }         from '../../api/prescriptions.api'
import { useInventoryStats }     from '../../api/inventory.api'
import {
  LayoutDashboard, ShoppingCart, Receipt, Pill,
  Users, Package, Truck, FileText, PieChart,
  Shield, UserCog, ClipboardList, BarChart3,
  Settings, LogOut, ChevronRight,
} from 'lucide-react'

interface NavItem {
  to:      string
  label:   string
  icon:    React.ReactNode
  badge?:  number
  badgeColor?: string
  roles?:  string[]
}

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to:'/dashboard', label:'Dashboard',     icon:<LayoutDashboard size={16}/> },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to:'/pos',    label:'Point of Sale',  icon:<ShoppingCart size={16}/> },
      { to:'/sales',  label:'Sales History',  icon:<Receipt size={16}/> },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { to:'/prescriptions', label:'Prescriptions', icon:<Pill size={16}/>, badgeColor:'red' },
      { to:'/patients',      label:'Patients',       icon:<Users size={16}/> },
      { to:'/drugs',         label:'Drug Database',  icon:<Pill size={16}/> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to:'/inventory', label:'Inventory',       icon:<Package size={16}/>, badgeColor:'amber' },
      { to:'/suppliers', label:'Suppliers',       icon:<Truck size={16}/> },
      { to:'/purchases', label:'Purchase Orders', icon:<FileText size={16}/> },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to:'/finance',   label:'Finance',   icon:<PieChart size={16}/>,   roles:['SUPER_ADMIN','PHARMACIST','ACCOUNTANT','STORE_MANAGER'] },
      { to:'/insurance', label:'Insurance', icon:<Shield size={16}/>,     roles:['SUPER_ADMIN','PHARMACIST','ACCOUNTANT'] },
      { to:'/reports',   label:'Reports',   icon:<BarChart3 size={16}/>,  roles:['SUPER_ADMIN','PHARMACIST','ACCOUNTANT','STORE_MANAGER'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to:'/staff',    label:'Staff & Roles', icon:<UserCog size={16}/>,     roles:['SUPER_ADMIN','PHARMACIST'] },
      { to:'/audit',    label:'Audit Log',     icon:<ClipboardList size={16}/>,roles:['SUPER_ADMIN','PHARMACIST'] },
      { to:'/settings', label:'Settings',      icon:<Settings size={16}/> },
    ],
  },
]

export default function Sidebar() {
  const { user, logout }   = useAuthStore()
  const { data: queueStats } = useQueueStats()
  const { data: invStats }   = useInventoryStats()
  const navigate             = useNavigate()

  const pending  = (queueStats?.pending ?? 0) + (queueStats?.urgent ?? 0)
  const lowStock = invStats?.lowStock ?? 0

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 min-w-[224px] h-screen bg-bg2/90 backdrop-blur-glass
                      border-r border-border flex flex-col overflow-hidden z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue to-indigo-600
                        flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,.4)]">
          <Pill size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-text tracking-tight">PharmPro</div>
          <div className="text-xs text-text3 tracking-widest uppercase">Enterprise</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin space-y-1">
        {NAV_SECTIONS.map(section => {
          // Filter by role
          const visible = section.items.filter(item =>
            !item.roles || (user && item.roles.includes(user.role)),
          )
          if (!visible.length) return null

          return (
            <div key={section.title} className="mb-2">
              <p className="text-xs font-bold text-text3 uppercase tracking-widest
                            px-2 py-1.5 mt-1">
                {section.title}
              </p>
              {visible.map(item => {
                const badge = item.to === '/prescriptions' ? pending
                            : item.to === '/inventory'     ? lowStock
                            : 0

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium',
                      'transition-all duration-150 relative group',
                      isActive
                        ? 'bg-blue-lt text-blue font-semibold'
                        : 'text-text2 hover:bg-surface hover:text-text',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-[22%] bottom-[22%] w-0.5
                                           bg-blue rounded-r-full" />
                        )}
                        <span className={clsx(isActive ? 'text-blue' : 'text-text3 group-hover:text-text2')}>
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 && (
                          <span className={clsx(
                            'text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                            item.badgeColor === 'amber' ? 'bg-amber' : 'bg-red',
                          )}>
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-2 py-3">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                        hover:bg-surface cursor-pointer transition-colors group"
             onClick={() => navigate('/settings')}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue to-indigo-600
                          flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-text3 truncate">{user?.role}</p>
          </div>
          <ChevronRight size={14} className="text-text3 group-hover:text-text2" />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-lg text-sm
                     text-text3 hover:text-red hover:bg-red-lt transition-all duration-150"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}


