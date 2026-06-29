// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Button.tsx
// ════════════════════════════════════════════════════════════
import { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary'|'ghost'|'danger'|'success'|'warning'
type Size    = 'xs'|'sm'|'md'|'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     ReactNode
  children?: ReactNode
}

const variantMap: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-blue to-indigo-600 text-white shadow-[0_2px_8px_rgba(59,130,246,.35)] hover:shadow-[0_4px_16px_rgba(59,130,246,.5)] hover:-translate-y-px',
  ghost:   'bg-surface text-text2 border border-border hover:bg-bg4 hover:text-text hover:border-border',
  danger:  'bg-red-lt text-red border border-red/20 hover:bg-red/25',
  success: 'bg-green-lt text-green border border-green/20 hover:bg-green/25',
  warning: 'bg-amber-lt text-amber border border-amber/20 hover:bg-amber/25',
}

const sizeMap: Record<Size, string> = {
  xs: 'px-2.5 py-1   text-xs  rounded-md gap-1.5',
  sm: 'px-3   py-1.5 text-xs  rounded-md gap-1.5',
  md: 'px-4   py-2.5 text-sm  rounded-lg gap-2',
  lg: 'px-5   py-3   text-sm  rounded-lg gap-2 font-semibold',
}

export function Button({
  variant = 'ghost',
  size    = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variantMap[variant],
        sizeMap[size],
        className,
      )}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
    </button>
  )
}


