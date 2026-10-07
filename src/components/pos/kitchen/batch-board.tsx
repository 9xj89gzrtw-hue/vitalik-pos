'use client'

import { useMemo } from 'react'
import { buildCourseGroups } from '@/lib/derive'
import { COURSE_TITLES, findMenuItem } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import type { CoursePriority, Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BatchRow } from './batch-row'
import { BoardEmpty } from './board-empty'

/* Акценты курсов: 1 салаты / 2 горячие закуски / 3 горячее и гарниры / 4 десерты */
const COURSE_BADGE: Record<CoursePriority, string> = {
  1: 'bg-emerald-400/15 text-emerald-400',
  2: 'bg-amber-400/15 text-amber-400',
  3: 'bg-orange-500/15 text-orange-400',
  4: 'bg-rose-400/15 text-rose-400',
}

/**
 * Защита от старых payload-ов: если позиция приехала без category —
 * обогащаем по меню (fallback — заголовок курса). Спред сохраняет
 * garnishId / garnishName / isAddition, поэтому строки гарниров и
 * дозаказы попадают в buildCourseGroups как есть.
 */
type ItemWithCategory = OrderItem & { category?: string }

function withCategory(orders: Order[]): Order[] {
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => {
      const raw = item as ItemWithCategory
      if (raw.category) return raw
      const category = findMenuItem(item.menuItemId)?.category ?? COURSE_TITLES[item.coursePriority]
      return { ...item, category }
    }),
  }))
}

/** Режим А — «Сводка цеха»: батчинг позиций по 4 курсам */
export function BatchBoard() {
  const orders = usePosStore((s) => s.orders)
  const groups = useMemo(() => buildCourseGroups(withCategory(orders), COURSE_TITLES), [orders])

  if (!groups.some((g) => g.rows.length > 0)) {
    return <BoardEmpty title="Заказов нет" />
  }

  return (
    <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
      {/* Предсказуемая сетка повара: всегда 4 колонки курсов */}
      <div className="grid grid-cols-1 gap-4 p-4 md:h-full md:grid-cols-2 md:grid-rows-2 md:p-5 xl:grid-cols-4 xl:grid-rows-1">
        {groups.map((group) => (
          <section
            key={group.priority}
            className="bg-secondary/30 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border"
          >
            <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-3">
              <span
                className={cn(
                  'font-display grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold tabular-nums',
                  COURSE_BADGE[group.priority],
                )}
              >
                {group.priority}
              </span>
              <h2 className="font-display text-foreground min-w-0 flex-1 text-[13px] leading-tight font-bold tracking-wide uppercase line-clamp-2">
                {group.title}
              </h2>
              <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap">
                {group.rows.length} · {group.totalQty} шт
              </span>
            </header>

            <div className="scrollbar-slim min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
              {group.rows.length === 0 ? (
                <p className="text-muted-foreground/50 py-10 text-center text-xs font-medium">
                  Пусто
                </p>
              ) : (
                group.rows.map((row) => <BatchRow key={row.menuItemId} row={row} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
