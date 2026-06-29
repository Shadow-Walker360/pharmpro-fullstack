// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/SearchInput.tsx
// ════════════════════════════════════════════════════════════
import { Search } from 'lucide-react'
import { clsx }   from 'clsx'
import { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  containerClass?: string
}

export function SearchInput({ containerClass, className, ...props }: Props) {
  return (
    <div className={clsx(
      'flex items-center gap-2 bg-surface border border-border rounded-2xl px-3 py-2',
      'focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20 transition-all',
      containerClass,
    )}>
      <Search size={14} className="text-text3 flex-shrink-0" />
      <input
        {...props}
        className={clsx(
          'bg-transparent border-none outline-none text-sm text-text',
          'placeholder:text-text3 w-full',
          className,
        )}
      />
    </div>
  )
}