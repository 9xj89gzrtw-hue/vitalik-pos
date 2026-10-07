'use client'

import { Megaphone, PackageCheck } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { Order } from '@/lib/types'
import { formatElapsed, orderPieces, pluralDishes } from '@/lib/derive'
import { cn } from '@/lib/utils'

/* ============================================================
   Баннер для раннера — всплывает, когда заказ готов:
   «📢 ВЫНОС: СТОЛ №7 | Официант: АННА | Блюда: …»
   Шеф зовёт раннера и жмёт [ОТДАНО РАННЕРУ].
   ============================================================ */

export function RunnerBanner({ orders }: { orders: Order[] }) {
  const serveOrder = useAppStore((s) => s.serveOrder)

  return (
    <section aria-label="Вынос на раздаче" className="flex flex-col gap-3">
      {orders
        .sort((a, b) => {
          if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1
          return (a.readyAt ?? a.sentAt) - (b.readyAt ?? b.sentAt)
        })
        .map((order) => {
          const waiting = Date.now() - (order.readyAt ?? Date.now())
          return (
            <article
              key={order.id}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-[3px] shadow-[0_0_36px_-8px_rgba(16,185,129,0.6)]"
            >
              <div className="rounded-[22px] bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-4 text-black">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black/15">
                      <Megaphone className="h-6 w-6" strokeWidth={2.5} />
                    </span>
                    <div className="leading-none">
                      <div className="font-display text-[26px] font-black uppercase leading-none tracking-tight">
                        Вынос: {order.tableLabel}
                      </div>
                      <div className="mt-1.5 text-[13px] font-extrabold">
                        Официант: {order.waiterName}
                        {order.isVIP ? ' · ⚡ ВИП' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-lg font-black tabular-nums leading-none">
                      ⏱ {formatElapsed(waiting)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                      на раздаче
                    </div>
                  </div>
                </div>

                <ul className="mt-3 flex flex-col gap-1 rounded-2xl bg-black/10 px-4 py-3">
                  {order.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="text-[15px] font-extrabold leading-snug">
                      {item.qty}× {item.name}
                      {item.garnishId && (
                        <span className="font-bold opacity-75"> + {item.garnishName}</span>
                      )}
                    </li>
                  ))}
                  {order.items.length > 4 && (
                    <li className="text-[13px] font-bold opacity-75">
                      … и ещё {order.items.length - 4} позиц.
                    </li>
                  )}
                </ul>

                <button
                  type="button"
                  onClick={() => void serveOrder(order.id)}
                  className={cn(
                    'mt-3 flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-black text-[16px] font-black text-emerald-400 transition-all active:scale-[0.98]',
                  )}
                >
                  <PackageCheck className="h-6 w-6" strokeWidth={2.5} />
                  ОТДАНО РАННЕРУ
                  <span className="text-[12px] font-bold opacity-60">
                    ({pluralDishes(orderPieces(order))})
                  </span>
                </button>
              </div>
            </article>
          )
        })}
    </section>
  )
}
