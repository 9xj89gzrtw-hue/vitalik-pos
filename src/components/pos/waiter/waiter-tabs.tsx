'use client'

import { ClipboardList, NotebookPen } from 'lucide-react'
import { tableHasReady } from '@/lib/derive'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { WaiterTab } from '@/lib/types'

const TABS: { value: WaiterTab; label: string }[] = [
  { value: 'menu', label: 'Новый заказ' },
  { value: 'orders', label: 'Заказы стола' },
]

/**
 * Ряд 2 шапки: сегмент-контрол «Новый заказ / Заказы стола».
 * На вкладке заказов — мини-бейдж активных позиций стола (шт)
 * и изумрудная точка, если у стола есть готовые блюда.
 */
export function WaiterTabs() {
  const tab = usePosStore((s) => s.waiterTab)
  const setTab = usePosStore((s) => s.setWaiterTab)
  const selectedTable = usePosStore((s) => s.selectedTable)
  const orders = usePosStore((s) => s.orders)

  /* активные позиции выбранного стола, шт */
  const activePieces = orders
    .filter((o) => o.tableNumber === selectedTable)
    .reduce((acc, o) => acc + o.items.reduce((a, i) => a + i.qty, 0), 0)
  const hasReady = tableHasReady(orders, selectedTable)

  return (
    <div
      role="tablist"
      aria-label="Режим официанта"
      className="mx-4 mt-1 grid grid-cols-2 rounded-xl bg-secondary p-1"
    >
      {TABS.map(({ value, label }) => {
        const active = tab === value
        const showBadge = value === 'orders' && activePieces > 0
        return (
          <button
            key={value}
            id={`waiter-tab-${value}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`waiter-panel-${value}`}
            onClick={() => setTab(value)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              active
                ? 'bg-foreground font-bold text-background shadow-sm'
                : 'font-medium text-muted-foreground',
            )}
          >
            {value === 'menu' ? (
              <NotebookPen className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{label}</span>
            {showBadge ? (
              <span
                className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold tabular-nums text-primary-foreground"
                aria-label={`${activePieces} шт. в работе`}
              >
                {activePieces}
              </span>
            ) : null}
            {value === 'orders' && hasReady ? (
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
