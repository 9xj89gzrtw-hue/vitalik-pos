'use client'

import { buildTicketCourses, formatClock, formatElapsed, itemPhase, PHASE_META } from '@/lib/derive'
import { cookingOf, queuedOf, readyOf } from '@/lib/types'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Тикет стола: курсы Салаты → Закуски → Горячее → Гарниры →
   Завтраки → Десерты, гарниры вложены под блюдом. ВИП — мерцающая
   золотая рамка, дозаказы помечены. Статус каждой позиции — крупно.
   ============================================================ */

export function TicketCard({ order, now }: { order: Order; now: number }) {
  const courses = buildTicketCourses(order)
  const elapsed = now - order.createdAt

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border',
        order.vip ? 'vip-frame' : 'border-[#262B35] bg-[#161922]',
      )}
    >
      {/* Шапка тикета */}
      <header className="flex flex-wrap items-center gap-2 border-b border-[#262B35] bg-[#0D0F12]/60 px-4 py-3">
        <span className="text-[22px] font-black leading-none text-[#F5F1E8]">СТОЛ {order.table}</span>
        <span className="rounded-full bg-[#161922] px-2.5 py-1 text-[12px] font-bold text-zinc-400">
          {order.waiter}
        </span>
        {order.vip && <span className="vip-chip">⭐ ВИП СТОЛ</span>}
        {order.addendumCount > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-300">
            +{order.addendumCount} дозаказ
          </span>
        )}
        {!order.acknowledged && (
          <span className="animate-pulse rounded-full bg-[#EF4444]/20 px-2.5 py-1 text-[11px] font-black text-red-400">
            🔔 НОВЫЙ — ждёт «ПРИНЯТЬ»
          </span>
        )}
        <span
          className={cn(
            'ml-auto tabular-nums text-[12px] font-black',
            elapsed > 20 * 60 * 1000 ? 'text-[#EF4444]' : elapsed > 10 * 60 * 1000 ? 'text-amber-300' : 'text-zinc-500',
          )}
        >
          {formatClock(order.createdAt)} · {formatElapsed(elapsed)}
        </span>
      </header>

      {/* Комментарий к столу */}
      {order.comment && (
        <p className="bg-amber-500/10 px-4 py-2 text-[13px] font-bold text-amber-200">
          💬 {order.comment}
        </p>
      )}

      {/* Позиции по курсам */}
      <div className="flex flex-col gap-3 p-4">
        {courses.map((course) => (
          <section key={course.title} aria-label={course.title}>
            <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
              {course.title}
            </h3>
            <div className="flex flex-col gap-1.5">
              {course.lines.map(({ item, garnishes }) => {
                const meta = PHASE_META[itemPhase(item)]
                return (
                  <div key={item.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[17px] font-black leading-snug text-[#F5F1E8]">
                        {item.name} ×{item.qty}
                      </span>
                      <span className={cn('shrink-0 text-[14px] font-black', meta.cls)}>
                        {meta.icon} {meta.label}
                        <Portions item={item} />
                      </span>
                    </div>
                    {item.comment && (
                      <div className="text-[12px] font-bold text-amber-300/90">💬 {item.comment}</div>
                    )}
                    {garnishes.map((g) => {
                      const gm = PHASE_META[itemPhase(g)]
                      return (
                        <div key={g.id} className="flex items-baseline justify-between gap-3 pl-4">
                          <span className="text-[14px] font-bold text-zinc-400">
                            └ {g.name} ×{g.qty}
                          </span>
                          <span className={cn('shrink-0 text-[12px] font-black', gm.cls)}>
                            {gm.icon}
                            <Portions item={g} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}

/** «2/3» — прогресс порций, когда статусы смешанные */
function Portions({ item }: { item: Order['items'][number] }) {
  const cooking = cookingOf(item)
  const ready = readyOf(item)
  const queued = queuedOf(item)
  const active = cooking + ready
  if (queued === 0 && active > 0 && active < item.qty) {
    return <span className="ml-1 tabular-nums opacity-70">{active}/{item.qty}</span>
  }
  if (ready > 0 && ready < item.qty) {
    return <span className="ml-1 tabular-nums opacity-70">{ready}/{item.qty}</span>
  }
  return null
}
