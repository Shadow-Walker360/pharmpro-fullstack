// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Modal.tsx
// ════════════════════════════════════════════════════════════
import { ReactNode, useEffect }  from 'react'
import { clsx }                  from 'clsx'
import { X }                     from 'lucide-react'

interface ModalProps {
  open:       boolean
  onClose:    () => void
  title:      string
  children:   ReactNode
  footer?:    ReactNode
  size?:      'sm'|'md'|'lg'|'xl'
  icon?:      ReactNode
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, footer, size='md', icon }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={clsx(
        'w-full glass-card relative overflow-hidden',
        'animate-[modalIn_.22s_ease]',
        sizeMap[size],
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-text flex items-center gap-2">
            {icon && <span className="text-blue">{icon}</span>}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text3
                       hover:bg-surface hover:text-text transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-bg/40 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}


