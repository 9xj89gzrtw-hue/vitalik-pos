'use client'

import { useMemo } from 'react'
import { getTableStatus, type TableKitchenStatus } from '@/lib/derive'
import { TABLES_COUNT } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Точка-статус стола на кухне (new / cooking / ready) */
const STATUS_DOT: Record<TableKitchenStatus, string | null> = {
  none: null,
  new: 'bg-zinc-400',
  cooking: 'bg-amber-500',
  ready: 'bg-emerald-500',
}

/** Ряд 2 шапки: горизонтальная лента выбора стола с точками статуса кухни */
export function TableBar() {
  const selectedTable = usePosStore((s) => s.selectedTable)
  const setSelectedTable = usePosStore((s) => s.setSelectedTable)
  const orders = usePosStore((s) => s.orders)

  const statuses = useMemo(() => {
    const list: TableKitchenStatus[] = []
    for (let table = 1; table <= TABLES_COUNT; table++) list.push(getTableStatus(orders, table))
    return list
  }, [orders])

  return (
    <div>
      <p className="px-4 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Столы
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {statuses.map((status, i) => {
          const table = i + 1
          const dot = STATUS_DOT[status]
          const selected = table === selectedTable
          return (
            <button
              key={table}
              type="button"
              aria-label={`Стол ${table}`}
              aria-pressed={selected}
              onClick={() => setSelectedTable(table)}
              className={cn(
                'relative grid h-11 min-w-[52px] shrink-0 place-items-center rounded-xl font-display text-base font-bold transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                selected
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'border border-border bg-card text-foreground',
              )}
            >
              {table}
              {dot ? (
                <span
                  className={cn('absolute right-1.5 top-1.5 size-1.5 rounded-full', dot)}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
