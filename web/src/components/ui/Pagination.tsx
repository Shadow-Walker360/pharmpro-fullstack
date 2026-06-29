// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Pagination.tsx
// ════════════════════════════════════════════════════════════
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button }                    from './Button'

interface PaginationProps {
  page:    number
  pages:   number
  total:   number
  limit:   number
  onChange:(page: number) => void
}

export function Pagination({ page, pages, total, limit, onChange }: PaginationProps) {
  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <span className="text-xs text-text3">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="xs"
          icon={<ChevronLeft size={14} />}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
          return (
            <Button
              key={p} variant={p === page ? 'primary' : 'ghost'} size="xs"
              onClick={() => onChange(p)}
            >
              {p}
            </Button>
          )
        })}
        <Button
          variant="ghost" size="xs"
          icon={<ChevronRight size={14} />}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  )
}


