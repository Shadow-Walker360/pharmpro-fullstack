// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Card.tsx
// ════════════════════════════════════════════════════════════
import { ReactNode } from 'react'
import { clsx }      from 'clsx'

interface CardProps {
  children:  ReactNode
  className?: string
  padding?:  boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx(
      'glass-card overflow-hidden',
      padding && 'p-5',
      className,
    )}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title:    ReactNode
  subtitle?: string
  action?:  ReactNode
  icon?:    ReactNode
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-blue">{icon}</span>}
        <div>
          <h3 className="text-sm font-bold text-text">{title}</h3>
          {subtitle && <p className="text-xs text-text3 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}


