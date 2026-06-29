// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Select.tsx
// ════════════════════════════════════════════════════════════
import { SelectHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string
  error?:   string
  options:  { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-text2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        {...props}
        className={clsx(
          'w-full bg-surface border border-border rounded-lg px-3 py-2.5',
          'text-sm text-text',
          'outline-none transition-all duration-150 cursor-pointer',
          'focus:border-blue focus:ring-2 focus:ring-blue/20',
          error && 'border-red',
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}
            className="bg-bg3 text-text">{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'


