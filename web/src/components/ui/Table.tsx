// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/Table.tsx
// ════════════════════════════════════════════════════════════
import { ReactNode } from 'react'
import { clsx }      from 'clsx'

interface Column<T> {
  key:       string
  header:    string
  render?:   (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns:   Column<T>[]
  data:      T[]
  loading?:  boolean
  emptyMsg?: string
  onRowClick?(row: T): void
  rowKey:    (row: T) => string
}

export function Table<T>({
  columns, data, loading, emptyMsg = 'No records found', onRowClick, rowKey,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className="text-left text-xs font-bold text-text3 uppercase tracking-wider
                           px-3 py-3 border-b border-border whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-3">
                      <div className="shimmer h-4 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
            ? (
                <tr>
                  <td colSpan={columns.length}
                    className="text-center py-12 text-text3 text-sm">
                    {emptyMsg}
                  </td>
                </tr>
              )
            : data.map(row => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'border-b border-border/40 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface',
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key}
                      className={clsx('px-3 py-3 text-sm', col.className)}>
                      {col.render
                        ? col.render(row)
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}


