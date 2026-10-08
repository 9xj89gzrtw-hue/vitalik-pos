'use client'

import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { haptic } from '@/lib/audio'
import { PERIOD_HOURS, PERIOD_LABELS, categoriesForPeriod } from '@/lib/menu'
import type { MenuItem, Period, StopList } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUi } from '../ui'
import type { CartItem } from './waiter-screen'

/* ============================================================
   Вкладка «Меню»: Завтрак (10:00–12:00) / Обед (12:00–18:00),
   стоп-лист и остатки прямо на карточках.
   ============================================================ */

interface MenuTabProps {
  period: Period
  stoplist: StopList
  cart: CartItem[]
  onDish: (dish: MenuItem) => void
}

export function MenuTab({ period, stoplist, cart, onDish }: MenuTabProps) {
  const { setPeriod } = useUi()
  const categories = categoriesForPeriod(period)

  return (
    <div className="flex flex-col gap-4">
      {/* Переключатель смены */}
      <div
        role="tablist"
        aria-label="Смена меню"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
      >
        {(['breakfast', 'lunch'] as Period[]).map((p) => {
          const selected = period === p
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                haptic(8)
                setPeriod(p)
              }}
              className={cn(
                'h-[48px] rounded-xl text-[13px] font-black leading-tight transition-all',
                selected ? 'bg-[#F5F1E8] text-[#0D0F12]' : 'text-zinc-400',
              )}
            >
              {PERIOD_LABELS[p]}
              <span className={cn('block text-[10px] font-bold', selected ? 'text-zinc-600' : 'text-zinc-600')}>
                {PERIOD_HOURS[p]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Категории и блюда */}
      {categories.map((cat) => (
        <section key={cat.name} aria-label={cat.name} className="flex flex-col gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
            {cat.name}
          </h2>
          <div className="flex flex-col gap-2">
            {cat.items.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                stop={stoplist[dish.id]}
                inCart={cart.filter((c) => c.menuItemId === dish.id).reduce((a, c) => a + c.qty, 0)}
                onDish={onDish}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="pb-2 pt-1 text-center text-[11px] leading-relaxed text-zinc-600">
        Горячие блюда и закуски — с выбором гарнира.
        <br />
        Гарниры можно заказать и отдельно во вкладке «Гарниры».
      </p>
    </div>
  )
}

function DishCard({
  dish,
  stop,
  inCart,
  onDish,
}: {
  dish: MenuItem
  stop?: { stopped: boolean; limit: number | null; remaining: number | null }
  inCart: number
  onDish: (dish: MenuItem) => void
}) {
  const stopped = stop?.stopped ?? false
  const remaining = stop?.remaining ?? null
  const limited = remaining != null
  const soldOut = limited && remaining <= 0

  const handle = () => {
    if (stopped || soldOut) {
      haptic([15, 40, 15])
      toast.error(`«${dish.short}» в стоп-листе`)
      return
    }
    haptic(10)
    onDish(dish)
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-disabled={stopped || soldOut}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]',
        stopped || soldOut
          ? 'border-[#262B35]/60 bg-[#161922]/50 opacity-55 grayscale'
          : 'border-[#262B35] bg-[#161922] active:border-[#D4AF37]/50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn('text-[15px] font-bold leading-snug', stopped || soldOut ? 'text-zinc-500' : 'text-[#F5F1E8]')}>
          {dish.name}
        </div>
        {dish.description && (
          <div className="mt-0.5 truncate text-[11.5px] leading-snug text-zinc-500">{dish.description}</div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {stopped && (
            <span className="rounded-lg bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-black text-[#EF4444]">
              🚫 В СТОПЕ
            </span>
          )}
          {!stopped && limited && (
            <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-300">
              ⚠️ Осталось: {remaining} шт.
            </span>
          )}
          {dish.garnishAttachable && !stopped && (
            <span className="rounded-lg bg-[#D4AF37]/10 px-2 py-0.5 text-[11px] font-bold text-[#D4AF37]">
              + гарнир
            </span>
          )}
          {inCart > 0 && (
            <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-300">
              в чеке ×{inCart}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border',
          stopped || soldOut
            ? 'border-[#262B35] text-zinc-600'
            : 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]',
        )}
        aria-hidden
      >
        <Plus className="h-5 w-5" strokeWidth={2.6} />
      </span>
    </button>
  )
}
