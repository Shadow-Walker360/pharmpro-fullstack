// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/EmptyState.tsx
// ════════════════════════════════════════════════════════════
import { ReactNode } from 'react'

interface Props {
  icon:     ReactNode
  title:    string
  message?: string
  action?:  ReactNode
}

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-text3 text-5xl mb-4 opacity-40">{icon}</div>
      <h3 className="text-text font-bold text-base mb-1">{title}</h3>
      {message && <p className="text-text3 text-sm mb-6 max-w-xs">{message}</p>}
      {action}
    </div>
  )
}