'use client'

import { ChefHat, CircleCheckBig, Flame, Lock, ShoppingBag } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { buildKitchenTicket, formatClock, formatElapsed, timerLevel } from '@/lib/derive'
import type { Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Тикет заказа на кухне: ультра-крупный шрифт, группировка по
   цехам, 2 клика шефа: [ПРИНЯТЬ В РАБОТУ] → [ГОТОВО!].
   Тап по блюду переключает готовность (для частичной выдачи).
   ============================================================ */

export function TicketCard({ order, now }: { order: Order; now: number }) {
  const flash = useAppStore((s) => s.flash[order.id] ?? 0)
  const acceptOrder = useAppStore((s) => s.acceptOrder)
  const readyOrder = useAppStore((s) => s.readyOrder)
  const toggleItem = useAppStore((s) => s.toggleItem)

  const elapsed = now - order.sentAt
  const level = timerLevel(elapsed)
  const isNew = flash > now
  const sent = order.status === 'sent'
  const { groups, addendumItems } = buildKitchenTicket(order)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border bg-[#161B23]',
        order.isVIP ? 'vip-frame' : 'border-white/[0.07]',
        isNew && 'ring-2 ring-yellow-300/70',
      )}
    >
      {/* Шапка тикета */}
      <div
        className={cn(
          'flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3',
          order.isVIP && 'bg-gradient-to-r from-[#3A2412]/60 to-transparent',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[30px] font-black uppercase leading-none tracking-tight text-zinc-50">
              {order.tableLabel}
            </h3>
            {order.isVIP && (
              <span className="vip-chip animate-pulse text-[12px]">⚡ ВИП / ЗАКАЗЧИК!</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
            <span className="rounded-lg bg-[#242B36] px-2 py-1">{order.waiterName}</span>
            <span className="tabular-nums text-zinc-500">в {formatClock(order.sentAt)}</span>
            {order.addendumCount > 0 && (
              <span className="rounded-lg bg-amber-400/15 px-2 py-1 text-amber-300">
                +{order.addendumCount} дозаказ
              </span>
            )}
          </div>
        </div>
        <div
          className={cn(
            'shrink-0 rounded-2xl px-3 py-2 text-center',
            level === 'ok' && 'bg-emerald-500/15',
            level === 'warn' && 'bg-amber-500/15',
            level === 'late' && 'animate-pulse bg-red-500/20',
          )}
        >
          <div
            className={cn(
              'font-display text-2xl font-black tabular-nums leading-none',
              level === 'ok' && 'text-emerald-400',
              level === 'warn' && 'text-amber-400',
              level === 'late' && 'text-red-400',
            )}
          >
            {formatElapsed(elapsed)}
          </div>
          <div
            className={cn(
              'mt-1 text-[9px] font-black uppercase tracking-widest',
              level === 'ok' && 'text-emerald-400/70',
              level === 'warn' && 'text-amber-400/70',
              level === 'late' && 'text-red-400/80',
            )}
          >
            {level === 'late' ? 'опоздание!' : 'с отправки'}
          </div>
        </div>
      </div>

      {/* Комментарий к столу */}
      {order.tableNote && (
        <div className="border-b border-white/[0.06] bg-amber-400/10 px-4 py-2.5 text-[13px] font-extrabold leading-snug text-amber-300">
          ❗ {order.tableNote}
        </div>
      )}

      {/* Позиции по цехам */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {groups.map((group) => (
          <section key={group.title}>
            <h4 className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
              <span className="h-[2px] w-3 rounded-full bg-zinc-600" aria-hidden />
              {group.title}
              <span className="ml-auto rounded-md bg-[#242B36] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-400">
                {group.items.reduce((acc, i) => acc + i.qty, 0)} шт
              </span>
            </h4>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
                <KitchenItemRow
                  key={item.id}
                  item={item}
                  locked={sent}
                  onToggle={() => void toggleItem(item.id)}
                />
              ))}
            </ul>
          </section>
        ))}

        {/* Блок дозаказа */}
        {addendumItems.length > 0 && (
          <section className="rounded-2xl border border-dashed border-amber-400/45 bg-amber-400/[0.07] p-2.5">
            <h4 className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
              <ShoppingBag className="h-3.5 w-3.5" />
              Дозаказ к столу
            </h4>
            <ul className="flex flex-col gap-1">
              {addendumItems.map((item) => (
                <KitchenItemRow
                  key={item.id}
                  item={item}
                  locked={sent}
                  onToggle={() => void toggleItem(item.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Действия шефа */}
      <div className="border-t border-white/[0.06] p-3">
        {sent ? (
          <button
            type="button"
            onClick={() => void acceptOrder(order.id)}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-sky-400 text-[16px] font-black text-black shadow-lg shadow-sky-500/25 transition-all active:scale-[0.98]"
          >
            <ChefHat className="h-6 w-6" strokeWidth={2.5} />
            ПРИНЯТЬ В РАБОТУ
            <span className="text-[12px] font-bold opacity-60">официант сразу увидит</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void readyOrder(order.id)}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-[16px] font-black text-black shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
          >
            <CircleCheckBig className="h-6 w-6" strokeWidth={2.5} />
            ГОТОВО! — ВСЁ НА РАЗДАЧУ
          </button>
        )}
      </div>
    </article>
  )
}

/* Строка блюда на кухне: читается с 1 метра, тап = готово */
function KitchenItemRow({
  item,
  locked,
  onToggle,
}: {
  item: OrderItem
  locked: boolean
  onToggle: () => void
}) {
  const ready = item.status === 'ready'
  return (
    <li>
      <button
        type="button"
        onClick={locked ? undefined : onToggle}
        disabled={locked}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
          locked ? 'cursor-not-allowed opacity-70' : 'active:scale-[0.99]',
          ready ? 'bg-emerald-500/10' : 'bg-[#0F1115] hover:bg-[#1A2029]',
        )}
        aria-label={`${item.qty} × ${item.name}${ready ? ' — готово' : ''}`}
      >
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black',
            ready
              ? 'bg-emerald-500 text-black'
              : locked
                ? 'bg-[#242B36] text-zinc-600'
                : 'bg-amber-500/20 text-amber-400',
          )}
        >
          {ready ? (
            <CircleCheckBig className="h-6 w-6" strokeWidth={2.5} />
          ) : locked ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Flame className="h-6 w-6 animate-pulse" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block font-display text-[19px] font-black leading-tight',
              ready ? 'text-emerald-300 line-through decoration-2' : 'text-zinc-50',
            )}
          >
            {item.qty}× {item.name}
          </span>
          {item.garnishId && (
            <span className="mt-0.5 block text-[13px] font-bold text-zinc-400">
              ↳ Гарнир: {item.garnishName}
            </span>
          )}
          {item.standalone && (
            <span className="mt-0.5 block text-[13px] font-bold text-sky-300/80">
              ↳ отдельное блюдо
            </span>
          )}
          {item.comment && (
            <span className="mt-0.5 block text-[13px] font-extrabold text-amber-300">
              ❗ {item.comment}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
