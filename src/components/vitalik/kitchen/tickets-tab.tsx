'use client'

import { buildRunnerBanners, sortOrders } from '@/lib/derive'
import type { Order } from '@/lib/types'
import { RunnerBanner } from './runner-banner'
import { TicketCard } from './ticket-card'

/* ============================================================
   Режим 2 — «Заказы по столам»: тикеты по курсам
   (Салаты → Закуски → Горячее → Десерты), ВИП — золотая рамка,
   сверху контрастные баннеры ВЫНОС для раннеров без телефонов.
   ============================================================ */

export function TicketsTab({ orders, now }: { orders: Order[]; now: number }) {
  const banners = buildRunnerBanners(orders)
  const tickets = sortOrders(orders)
  const cookingCount = orders.length - banners.length

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-14 text-center">
        <div className="text-5xl" aria-hidden>
          🧾
        </div>
        <div className="mt-3 text-lg font-extrabold text-zinc-300">Тикетов нет</div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Как только официант отправит заказ — он появится здесь.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 📢 Баннеры ВЫНОС — зовут раннера */}
      {banners.length > 0 && (
        <section aria-label="Готово к выносу" className="flex flex-col gap-2">
          {banners.map((b) => (
            <RunnerBanner key={b.table} banner={b} />
          ))}
        </section>
      )}

      {/* Счётчики */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Счётчики кухни">
        <span className="rounded-full bg-[#F59E0B]/15 px-3 py-1 text-[12px] font-black text-amber-300">
          В работе: {cookingCount}
        </span>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[12px] font-black text-emerald-300">
          На раздаче: {banners.length}
        </span>
      </div>

      {/* Тикеты столов */}
      {tickets.map((order) => (
        <TicketCard key={order.id} order={order} now={now} />
      ))}
    </div>
  )
}
