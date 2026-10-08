'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { activeOrders } from '@/lib/derive'
import {
  categoriesForPeriod,
  isGarnishAttachable,
  itemsForPeriod,
  PERIOD_HOURS,
  PERIOD_LABELS,
} from '@/lib/menu'
import type { MenuItem, Period } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CartSheet } from './cart-sheet'
import { DishCard } from './dish-card'
import { GarnishSheet } from './garnish-sheet'

/* ============================================================
   Вкладка «Меню»: период (завтрак/обед), категории, карточки
   блюд со стоп-листом и остатками, гарниры, корзина снизу.
   ============================================================ */

export function MenuTab() {
  const period = useAppStore((s) => s.period)
  const setPeriod = useAppStore((s) => s.setPeriod)
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const orders = useAppStore((s) => s.orders)
  const addToDraft = useAppStore((s) => s.addToDraft)

  const [garnishFor, setGarnishFor] = useState<MenuItem | null>(null)

  const activeOrder = activeOrders(orders ?? []).find((o) => o.tableId === selectedTableId)
  const categories = categoriesForPeriod(period)

  const handleDishTap = (item: MenuItem) => {
    if (isGarnishAttachable(item)) {
      setGarnishFor(item)
      return
    }
    // гарнир из категории «Гарниры» заказывается отдельным блюдом
    addToDraft(selectedTableId, item, item.isGarnish ? { standalone: true } : undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Период меню */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1" role="group" aria-label="Период меню">
        {(Object.keys(PERIOD_HOURS) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            aria-label={`${PERIOD_LABELS[p]}, ${PERIOD_HOURS[p]}`}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex h-12 flex-col items-center justify-center rounded-xl transition-all active:scale-[0.98]',
              period === p ? 'bg-[#D4AF37] text-[#14100A]' : 'text-zinc-400',
            )}
          >
            <span className="text-sm font-extrabold leading-none">{PERIOD_LABELS[p]}</span>
            <span
              className={cn(
                'mt-1 text-[10px] font-semibold tabular-nums leading-none',
                period === p ? 'text-[#14100A]/70' : 'text-zinc-500',
              )}
            >
              {PERIOD_HOURS[p]}
            </span>
          </button>
        ))}
      </div>

      {/* Режим дозаказа */}
      {activeOrder && (
        <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3" role="status">
          <div className="text-[13px] font-extrabold text-[#F59E0B]">
            🟠 Дозаказ к {activeOrder.tableLabel}
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-amber-200/70">
            У стола уже есть активный заказ — новые блюда уедут на кухню с меткой «ДОЗАКАЗ»
          </div>
        </div>
      )}

      {/* Категории */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" aria-label="Категории меню">
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-label={`К категории «${c.chipLabel}»`}
            onClick={() => {
              document
                .getElementById(`waiter-cat-${c.name}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="flex h-11 shrink-0 items-center rounded-full border border-[#262B35] bg-[#161922] px-4 text-[13px] font-bold text-zinc-300 transition-all active:scale-[0.98]"
          >
            {c.chipLabel}
          </button>
        ))}
      </div>

      {/* Блюда по категориям */}
      <div className="flex flex-col gap-5">
        {categories.map((c) => {
          const catItems = itemsForPeriod(period).filter((m) => m.category === c.name)
          if (catItems.length === 0) return null
          return (
            <section key={c.name} id={`waiter-cat-${c.name}`} className="scroll-mt-24" aria-label={c.name}>
              <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                {c.name}
                {c.name === 'ГАРНИРЫ' && (
                  <span className="ml-2 font-semibold normal-case tracking-normal text-zinc-600">
                    можно и отдельно, и к блюду
                  </span>
                )}
              </h3>
              <div className="flex flex-col gap-2">
                {catItems.map((item) => (
                  <DishCard key={item.id} item={item} tableId={selectedTableId} onPick={handleDishTap} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* запас прокрутки под фиксированную корзину */}
      <div className="h-12" aria-hidden />

      <GarnishSheet item={garnishFor} onClose={() => setGarnishFor(null)} />
      <CartSheet />
    </div>
  )
}
