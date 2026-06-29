// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/KpiCard.tsx
// ════════════════════════════════════════════════════════════
import { ReactNode }   from 'react'
import { clsx }        from 'clsx'

type KpiColor = 'blue'|'green'|'amber'|'red'|'purple'|'teal'

interface KpiCardProps {
  label:    string
  value:    string | number
  change?:  string
  trend?:   'up'|'down'|'warn'
  icon:     ReactNode
  color:    KpiColor
  loading?: boolean
}

const colorMap: Record<KpiColor, { icon: string; bar: string; change: Record<string,string> }> = {
  blue:   { icon:'bg-blue-lt text-blue',   bar:'bg-blue',   change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
  green:  { icon:'bg-green-lt text-green', bar:'bg-green',  change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
  amber:  { icon:'bg-amber-lt text-amber', bar:'bg-amber',  change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
  red:    { icon:'bg-red-lt text-red',     bar:'bg-red',    change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
  purple: { icon:'bg-purple-lt text-purple',bar:'bg-purple',change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
  teal:   { icon:'bg-teal-lt text-teal',   bar:'bg-teal',   change:{up:'bg-green-lt text-green',down:'bg-red-lt text-red',warn:'bg-amber-lt text-amber'} },
}

export function KpiCard({ label, value, change, trend='up', icon, color, loading }: KpiCardProps) {
  const c = colorMap[color]

  if (loading) return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="shimmer h-4 w-24 rounded mb-3" />
      <div className="shimmer h-8 w-32 rounded mb-2" />
      <div className="shimmer h-3 w-20 rounded" />
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.bar}`} />
    </div>
  )

  return (
    <div className="glass-card p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform cursor-default">
      <div className="flex items-center justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl', c.icon)}>
          {icon}
        </div>
        {change && (
          <span className={clsx('text-xs font-bold px-2 py-1 rounded-full', c.change[trend])}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold text-text tracking-tight leading-none">
        {value}
      </div>
      <div className="text-xs text-text3 font-medium mt-1">{label}</div>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.bar} opacity-70`} />
    </div>
  )
}


