// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Input.tsx
// ════════════════════════════════════════════════════════════
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  leftIcon?: ReactNode
  rightIcon?:ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-text2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-base pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={clsx(
            'w-full bg-surface border border-border rounded-lg px-3 py-2.5',
            'text-sm text-text placeholder:text-text3',
            'outline-none transition-all duration-150',
            'focus:border-blue focus:ring-2 focus:ring-blue/20',
            error && 'border-red focus:border-red focus:ring-red/20',
            leftIcon  && 'pl-9',
            rightIcon && 'pr-9',
            className,
          )}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-base">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
      {hint  && <p className="text-xs text-text3">{hint}</p>}
    </div>
  ),
)
Input.displayName = 'Input'


