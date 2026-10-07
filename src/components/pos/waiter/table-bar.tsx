'use client'

import { useMemo } from 'react'
import { BellRing } from 'lucide-react'
import { getTableStatus, tableHasReady, type TableKitchenStatus } from '@/lib/derive'
import { TABLES_COUNT } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Точка-статус стола на кухне (new / cooking); 'ready' заменён мигающим чипом «Забрать!» */
const STATUS_DOT: Record<TableKitchenStatus, string | null> = {
  none: null,
  new: 'bg-zinc-400',
  cooking: 'bg-amber-500',
  ready: null,
}

/** Ряд 3 шапки: лента столов — мигающий emerald-чип, если есть готовые блюда */
export function TableBar() {
  const selectedTable = usePosStore((s) => s.selectedTable)
  const setSelectedTable = usePosStore((s) => s.setSelectedTable)
  const orders = usePosStore((s) => s.orders)

  const statuses = useMemo(() => {
    const list: { status: TableKitchenStatus; ready: boolean }[] = []
    for (let table = 1; table <= TABLES_COUNT; table++) {
      list.push({ status: getTableStatus(orders, table), ready: tableHasReady(orders, table) })
    }
    return list
  }, [orders])

  return (
    <div>
      <p className="px-4 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Столы
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5">
        {statuses.map(({ status, ready }, i) => {
          const table = i + 1
          const dot = ready ? null : STATUS_DOT[status]
          const selected = table === selectedTable
          return (
            <button
              key={table}
              type="button"
              aria-label={ready ? `Стол ${table} — забрать с кухни!` : `Стол ${table}`}
              aria-pressed={selected}
              onClick={() => setSelectedTable(table)}
              className={cn(
                'relative flex h-11 min-w-[52px] shrink-0 flex-col items-center justify-center rounded-xl font-display text-base font-bold transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                ready
                  ? 'animate-breathe border-transparent bg-emerald-600 text-white shadow-md'
                  : selected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border bg-card text-foreground',
              )}
            >
              {ready ? (
                <>
                  <span className="flex items-center gap-1 leading-none">
                    <BellRing className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                    <span className="text-[15px] leading-none">{table}</span>
                  </span>
                  <span className="mt-1 text-[8.5px] font-bold uppercase tracking-wide leading-none">
                    Забрать!
                  </span>
                </>
              ) : (
                table
              )}
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
