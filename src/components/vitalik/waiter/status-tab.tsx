'use client'

import { Plus } from 'lucide-react'
import { haptic } from '@/lib/audio'
import { buildTicketCourses, formatClock } from '@/lib/derive'
import { cookingOf, queuedOf, readyOf, servedOf } from '@/lib/types'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Вкладка «Статус стола (Где мой заказ?)»: статус каждой позиции
   в реальном времени: ⏳ В очереди → 🔥 Готовится → 🟢 ГОТОВО НА
   РАЗДАЧЕ → ⚪ Подано. Кнопка [+ Дозаказ].
   ============================================================ */

interface StatusTabProps {
  order: Order | null
  table: number | null
  onAddMore: () => void
}

export function StatusTab({ order, table, onAddMore }: StatusTabProps) {
  if (table == null) {
    return (
      <EmptyState
        icon="🪑"
        title="Выберите стол"
        hint="Тапните номер стола сверху — и статус его заказа появится здесь."
      />
    )
  }

  if (!order) {
    return (
      <EmptyState
        icon="🍽"
        title={`Стол ${table} свободен`}
        hint="Оформите заказ во вкладке «Меню» — кухня увидит его мгновенно."
      />
    )
  }

  const courses = buildTicketCourses(order)
  const anyReady = order.items.some((it) => readyOf(it) > 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Шапка заказа */}
      <div
        className={cn(
          'rounded-3xl border p-4',
          order.vip ? 'vip-frame' : 'border-[#262B35] bg-[#161922]',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[20px] font-black text-[#F5F1E8]">СТОЛ {order.table}</span>
          <span className="rounded-full bg-[#0D0F12] px-2.5 py-1 text-[12px] font-bold text-zinc-400">
            {order.waiter}
          </span>
          {order.vip && <span className="vip-chip">⭐ ВИП СТОЛ</span>}
          {order.addendumCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-300">
              +{order.addendumCount} дозаказ
            </span>
          )}
        </div>
        {order.comment && (
          <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] font-bold text-amber-200">
            💬 {order.comment}
          </p>
        )}
        <p className="mt-2 text-[11px] font-bold text-zinc-600">
          Заказ принят в {formatClock(order.createdAt)}
          {anyReady && ' · есть блюда на раздаче 🟢'}
        </p>
      </div>

      {/* Позиции по курсам */}
      {courses.map((course) => (
        <section key={course.title} className="flex flex-col gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
            {course.title}
          </h3>
          {course.lines.map(({ item, garnishes }) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#262B35] bg-[#161922] p-4"
            >
              <StatusLine item={item} />
              {garnishes.map((g) => (
                <div key={g.id} className="mt-2 ml-4 border-l-2 border-[#262B35] pl-3">
                  <StatusLine item={g} garnish />
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      {/* Дозаказ */}
      <button
        type="button"
        onClick={() => {
          haptic(12)
          onAddMore()
        }}
        className="flex h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D4AF37]/60 bg-[#D4AF37]/5 text-[15px] font-black text-[#F5E29A] active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        ДОЗАКАЗ К СТОЛУ {order.table}
      </button>
    </div>
  )
}

function StatusLine({ item, garnish }: { item: Order['items'][number]; garnish?: boolean }) {
  const queued = queuedOf(item)
  const cooking = cookingOf(item)
  const ready = readyOf(item)
  const served = servedOf(item)
  const isReady = ready > 0

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className={cn('text-[15px] font-bold leading-snug', garnish && 'text-[13.5px] text-zinc-300')}>
          {garnish && '└ '}
          {item.name} ×{item.qty}
        </div>
        {item.comment && (
          <div className="mt-0.5 text-[11.5px] font-bold text-amber-300/90">💬 {item.comment}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isReady && (
          <span className="animate-pulse rounded-lg bg-emerald-500/20 px-2 py-1 text-[12px] font-black text-emerald-300">
            🟢 ГОТОВО НА РАЗДАЧЕ{ready < item.qty ? ` · ${ready} из ${item.qty}` : ''}
          </span>
        )}
        {cooking > 0 && (
          <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[12px] font-black text-amber-300">
            🔥 Готовится{cooking < item.qty ? ` · ${cooking} из ${item.qty}` : ''}
          </span>
        )}
        {queued > 0 && (
          <span className="rounded-lg bg-[#0D0F12] px-2 py-1 text-[12px] font-black text-zinc-400">
            ⏳ В очереди{queued < item.qty ? ` · ${queued} из ${item.qty}` : ''}
          </span>
        )}
        {served > 0 && (
          <span className="rounded-lg bg-[#0D0F12] px-2 py-1 text-[12px] font-bold text-zinc-600">
            ⚪ Подано · {served} из {item.qty}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <div className="mt-3 text-lg font-extrabold text-zinc-300">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</div>
    </div>
  )
}
