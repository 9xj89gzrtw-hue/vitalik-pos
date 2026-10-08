'use client'

import { PackageCheck } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatElapsed, orderPieces, pluralDishes, sortKitchenOrders } from '@/lib/derive'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'
import { tableTitleOf } from './kitchen-utils'

/* ============================================================
   Блок «ВЫНОС ДЛЯ РАННЕРА» — все заказы со статусом ready.
   Шеф голосует раннера без телефона: большой изумрудный
   баннер + [ОТДАНО РАННЕРУ] (store.serveOrder).
   ============================================================ */

export function RunnerBanner({ orders, now }: { orders: Order[]; now: number }) {
  const serveOrder = useAppStore((s) => s.serveOrder)
  const sorted = sortKitchenOrders(orders ?? [])

  return (
    <section aria-label="Вынос для раннера" className="flex flex-col gap-3">
      {sorted.map((order) => {
        const waiting = Math.max(0, now - (order.readyAt ?? order.sentAt))
        return (
          <article
            key={order.id}
            className={cn(
              'animate-pulse-bg overflow-hidden rounded-3xl border-2 p-4',
              order.isVIP
                ? 'vip-frame'
                : 'border-emerald-500 bg-emerald-500/[0.08] shadow-[0_0_36px_-10px_rgba(16,185,129,0.55)]',
            )}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-xl"
                  aria-hidden
                >
                  📢
                </span>
                <div className="leading-none">
                  <div className="text-[26px] font-black uppercase leading-none tracking-tight text-emerald-300">
                    Вынос: {tableTitleOf(order)}
                  </div>
                  <div className="mt-1.5 text-[14px] font-extrabold text-[#F5F1E8]">
                    Официант: {order.waiterName}
                    {order.isVIP && <span className="text-[#D4AF37]"> · ⭐ ВИП</span>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-black tabular-nums leading-none text-emerald-300">
                  ⏱ {formatElapsed(waiting)}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  на раздаче
                </div>
              </div>
            </header>

            {/* Состав для раннера */}
            <ul className="mt-3 flex flex-col gap-1 rounded-2xl bg-black/25 px-4 py-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="text-[15px] font-extrabold leading-snug text-[#F5F1E8]"
                >
                  {item.qty}× {item.name}
                  {item.garnishId && (
                    <span className="font-bold text-zinc-400"> + {item.garnishName}</span>
                  )}
                  {item.comment && (
                    <span className="font-bold text-amber-300"> «{item.comment}»</span>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => void serveOrder(order.id)}
              aria-label={`Отдано раннеру — ${order.tableLabel}`}
              className="mt-3 flex h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-[16px] font-black text-[#05140E] shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              <PackageCheck className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              ОТДАНО РАННЕРУ
              <span className="text-[12px] font-bold opacity-60">
                ({pluralDishes(orderPieces(order))})
              </span>
            </button>
          </article>
        )
      })}
    </section>
  )
}
