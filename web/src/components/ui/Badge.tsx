// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Badge.tsx
// ════════════════════════════════════════════════════════════
import { clsx } from 'clsx'

type BadgeVariant = 'success'|'warning'|'danger'|'info'|'purple'|'teal'|'gray'

const badgeMap: Record<BadgeVariant, string> = {
  success: 'bg-green-lt  text-green',
  warning: 'bg-amber-lt  text-amber',
  danger:  'bg-red-lt    text-red',
  info:    'bg-blue-lt   text-blue',
  purple:  'bg-purple-lt text-purple',
  teal:    'bg-teal-lt   text-teal',
  gray:    'bg-surface   text-text2',
}

interface BadgeProps {
  variant:  BadgeVariant
  children: React.ReactNode
  dot?:     boolean
}

export function Badge({ variant, children, dot }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap',
      badgeMap[variant],
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', {
        'bg-green': variant==='success',
        'bg-amber': variant==='warning',
        'bg-red':   variant==='danger',
        'bg-blue':  variant==='info',
      })} />}
      {children}
    </span>
  )
}


