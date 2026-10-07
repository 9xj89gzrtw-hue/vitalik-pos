'use client'

import { Check, CheckCheck, CornerDownRight, Flame } from 'lucide-react'
import { plural, type TableTicket } from '@/lib/derive'
import { COURSE_TITLES, COURSE_TITLES_BREAKFAST, findMenuItem, GARNISH_CATEGORY, PERIOD_LABELS } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import type { CoursePriority, OrderItem, Period } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TicketTimer } from './ticket-timer'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card'

/** Карточка-тикет одного стола: шапка с таймером, позиции по курсам, «Стол отдан» */
export function TicketCard({ ticket }: { ticket: TableTicket }) {
  const period: Period = ticket.orders[0]?.period ?? 'lunch'
  const courseTitles = period === 'breakfast' ? COURSE_TITLES_BREAKFAST : COURSE_TITLES

  const byCourse = new Map<CoursePriority, OrderItem[]>()
  for (const item of ticket.items) {
    const list = byCourse.get(item.coursePriority) ?? []
    list.push(item)
    byCourse.set(item.coursePriority, list)
  }
  const courses = [...byCourse.entries()].sort((a, b) => a[0] - b[0])

  const progress =
    ticket.pieces > 0 ? Math.min(100, Math.round((ticket.donePieces / ticket.pieces) * 100)) : 0

  /* сколько заказов стола — дозаказы (приехали к уже активному столу) */
  const additions = ticket.orders.filter((o) => o.isAddition).length

  return (
    <article className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border border-border">
      {/* Шапка тикета */}
      <header className="flex flex-wrap items-center gap-2.5 border-b border-border bg-secondary/30 px-4 pt-3.5 pb-3">
        <h2 className="font-display text-foreground text-xl leading-none font-extrabold tracking-tight">
          СТОЛ {ticket.tableNumber}
        </h2>
        <TicketTimer startedAt={ticket.startedAt} />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide uppercase">
            {PERIOD_LABELS[period]}
          </span>
          {ticket.orders.length > 1 && (
            <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums">
              {ticket.orders.length} {plural(ticket.orders.length, 'заказ', 'заказа', 'заказов')}
            </span>
          )}
          {additions > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-400 whitespace-nowrap">
              {additions === 1
                ? 'дозаказ'
                : `+${additions} ${plural(additions, 'дозаказ', 'дозаказа', 'дозаказов')}`}
            </span>
          )}
        </div>
      </header>

      {/* Позиции по курсам */}
      <div className="min-h-0 flex-1 space-y-3 px-3.5 py-3">
        {courses.map(([priority, items]) => (
          <section key={priority}>
            <h3 className="text-muted-foreground/70 mb-1 text-[10px] font-bold tracking-wider uppercase">
              К{priority} · {courseTitles[priority]}
            </h3>
            <ul>
              {items.map((item) => (
                <TicketItem key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Футер: прогресс и архивация */}
      <footer className="p-3 pt-0">
        <div
          className="bg-secondary mb-2.5 h-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={`Готово ${ticket.donePieces} из ${ticket.pieces} шт.`}
          aria-valuemin={0}
          aria-valuemax={ticket.pieces}
          aria-valuenow={ticket.donePieces}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => usePosStore.getState().archiveTable(ticket.tableNumber)}
          className={cn(
            FOCUS,
            'active:scale-[0.98] bg-emerald-600 text-white hover:bg-emerald-500 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-extrabold transition-colors',
          )}
        >
          <CheckCheck className="size-4" strokeWidth={2.2} />
          Стол полностью отдан
        </button>
      </footer>
    </article>
  )
}

/** Amber-чип «ДОЗАКАЗ»: позиция приехала к уже активному столу */
function AdditionChip() {
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase whitespace-nowrap">
      Дозаказ
    </span>
  )
}

/** Строка позиции заказа с кнопкой-бампом «готово / вернуть» */
function TicketItem({ item }: { item: OrderItem }) {
  const done = item.status === 'done'
  const cooking = item.status === 'cooking'
  /* гарнир без привязки — самостоятельная позиция заказа */
  const standaloneGarnish = item.category === GARNISH_CATEGORY && !item.garnishId
  const garnishLabel = item.garnishId
    ? (item.garnishName ?? findMenuItem(item.garnishId)?.name ?? '—')
    : null

  return (
    <li className="flex items-start gap-2 py-1">
      <span
        className={cn(
          'w-8 shrink-0 pt-px text-[13px] font-extrabold tabular-nums',
          done ? 'text-emerald-400' : 'text-foreground',
        )}
      >
        {item.qty}×
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span
            className={cn(
              'text-[13px] leading-snug font-medium',
              done && 'text-muted-foreground line-through',
            )}
          >
            {item.name}
          </span>
          {item.isAddition && <AdditionChip />}
          {standaloneGarnish && (
            <span className="bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
              Отдельное блюдо
            </span>
          )}
        </div>

        {item.garnishId && (
          <p className="text-muted-foreground mt-0.5 ml-3 flex items-center gap-1 border-l border-border pl-2 text-[11.5px] leading-snug">
            <CornerDownRight className="size-3 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span className={done ? 'line-through' : undefined}>Гарнир: {garnishLabel}</span>
          </p>
        )}

        {item.comment && (
          <p className="mt-0.5 text-[11px] leading-snug text-amber-400/90 italic">
            «{item.comment}»
          </p>
        )}
      </div>

      {done && (
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-emerald-400">
          <Check className="size-3" strokeWidth={2.4} />
          Готово
        </span>
      )}
      {cooking && (
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-amber-400">
          <Flame className="size-3" strokeWidth={2.2} />
          Готовится
        </span>
      )}

      <button
        type="button"
        aria-label={done ? 'Вернуть в работу' : 'Готово'}
        onClick={() =>
          usePosStore.getState().setItemStatus([item.id], done ? 'cooking' : 'done')
        }
        className={cn(
          FOCUS,
          'grid size-7 shrink-0 place-items-center rounded-md border border-emerald-500/30 transition-colors active:scale-95',
          done
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'text-emerald-400/70 hover:bg-emerald-500/15 hover:text-emerald-400',
        )}
      >
        <Check className="size-4" strokeWidth={2.4} />
      </button>
    </li>
  )
}
