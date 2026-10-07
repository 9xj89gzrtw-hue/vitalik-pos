'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { activeOrders, pluralDishes } from '@/lib/derive'
import {
  categoriesForPeriod,
  isGarnishAttachable,
  itemsForPeriod,
  PERIOD_HOURS,
  PERIOD_LABELS,
  type MenuItem,
} from '@/lib/menu'
import type { Period } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GarnishSheet } from './garnish-sheet'
import { CartBar } from './cart-sheet'

/* ============================================================
   Вкладка «Меню и Корзина»: период, категории, блюда,
   гарниры к горячему, плавающая корзина.
   ============================================================ */

export function MenuTab() {
  const period = useAppStore((s) => s.period)
  const setPeriod = useAppStore((s) => s.setPeriod)
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const orders = useAppStore((s) => s.orders)
  const addToDraft = useAppStore((s) => s.addToDraft)
  const drafts = useAppStore((s) => s.drafts)

  const [garnishFor, setGarnishFor] = useState<MenuItem | null>(null)

  const activeOrder = activeOrders(orders).find((o) => o.tableId === selectedTableId)
  const draftQty = drafts[selectedTableId]?.items.reduce((acc, c) => acc + c.qty, 0) ?? 0

  const categories = categoriesForPeriod(period)

  const handleDishTap = (item: MenuItem) => {
    if (isGarnishAttachable(item)) {
      setGarnishFor(item)
      return
    }
    addToDraft(selectedTableId, item, item.isGarnish ? { standalone: true } : undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Переключатель времени */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#161B23] p-1" role="tablist">
        {(Object.keys(PERIOD_HOURS) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex h-[52px] flex-col items-center justify-center rounded-xl transition-all active:scale-[0.98]',
              period === p ? 'bg-[#242B36] shadow-inner' : '',
            )}
          >
            <span
              className={cn(
                'text-sm font-extrabold',
                period === p ? 'text-zinc-50' : 'text-zinc-400',
              )}
            >
              {PERIOD_LABELS[p]}
            </span>
            <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-zinc-500">
              {PERIOD_HOURS[p]}
            </span>
          </button>
        ))}
      </div>

      {/* Баннер режима дозаказа */}
      {activeOrder && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <div className="text-[13px] font-extrabold text-amber-300">
            🟠 Дозаказ к {activeOrder.tableLabel}
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-amber-200/70">
            У стола уже есть активный заказ — новые блюда уедут на кухню с меткой «ДОЗАКАЗ»
            {activeOrder.addendumCount > 0 ? ` (сейчас: ${activeOrder.addendumCount})` : ''}.
          </div>
        </div>
      )}

      {/* Категории */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => {
              document.getElementById(`cat-${c.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="h-10 shrink-0 rounded-full border border-white/10 bg-[#161B23] px-4 text-[13px] font-bold text-zinc-300 active:scale-95"
          >
            {c.chipLabel}
          </button>
        ))}
      </div>

      {/* Блюда по категориям */}
      <div className="flex flex-col gap-5">
        {categories.map((c) => (
          <section key={c.name} id={`cat-${c.name}`} className="scroll-mt-36">
            <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
              {c.name}
              {c.name === 'ГАРНИРЫ' && (
                <span className="ml-2 font-semibold normal-case tracking-normal text-zinc-600">
                  можно и отдельно, и к блюду
                </span>
              )}
            </h3>
            <div className="flex flex-col gap-2">
              {menuItemsOf(period, c.name).map((item) => {
                const qty = draftQtyOf(drafts[selectedTableId]?.items, item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDishTap(item)}
                    className="relative flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#161B23] p-4 text-left transition-all active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold leading-snug text-zinc-100">{item.name}</div>
                      {item.description && (
                        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {item.description}
                        </div>
                      )}
                      <div className="mt-1.5 text-[11px] font-semibold text-zinc-600">⏱ {item.time}</div>
                    </div>
                    {isGarnishAttachable(item) && (
                      <span className="absolute right-[76px] rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                        + гарнир
                      </span>
                    )}
                    {qty > 0 ? (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-lg font-black text-black shadow-lg shadow-emerald-500/30">
                        {qty}
                      </span>
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#242B36] text-zinc-400">
                        <Plus className="h-5 w-5" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="pb-2 text-center text-[11px] text-zinc-600">
        {draftQty > 0
          ? `В корзине: ${pluralDishes(draftQty)} — откройте корзину ниже ↓`
          : 'Нажимайте на блюда — они попадут в чек'}
      </div>

      {/* Гарниры к горячему */}
      <GarnishSheet item={garnishFor} onClose={() => setGarnishFor(null)} />

      {/* Плавающая корзина */}
      <CartBar />
    </div>
  )
}

function menuItemsOf(period: Period, categoryName: string): MenuItem[] {
  return itemsForPeriod(period).filter((m) => m.category === categoryName)
}

function draftQtyOf(items: { menuItemId: string; qty: number }[] | undefined, menuItemId: string): number {
  if (!items) return 0
  return items.filter((c) => c.menuItemId === menuItemId).reduce((acc, c) => acc + c.qty, 0)
}
