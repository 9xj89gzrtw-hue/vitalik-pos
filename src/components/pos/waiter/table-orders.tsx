'use client'

import { useMemo } from 'react'
import {
  Banknote,
  CheckCheck,
  ClipboardList,
  Clock3,
  CornerDownRight,
  Flame,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { useNowSeconds } from '@/components/pos/kitchen/use-now'
import { formatAgo, formatClock } from '@/lib/derive'
import { findMenuItem, GARNISH_CATEGORY } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { ItemStatus, Order, OrderItem } from '@/lib/types'

/* ---------- бейдж статуса позиции ---------- */

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'done') {
    return (
      <span className="animate-breathe inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
        <CheckCheck className="size-3" aria-hidden="true" />
        Готово к выдаче!
      </span>
    )
  }
  if (status === 'cooking') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">
        <Flame className="size-3" aria-hidden="true" />
        Готовится
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-zinc-400/30 bg-zinc-500/10 px-2.5 py-1 text-[10px] font-bold text-zinc-600">
      <Clock3 className="size-3" aria-hidden="true" />
      В очереди
    </span>
  )
}

/* ---------- строка позиции заказа ---------- */

function OrderItemRow({ item }: { item: OrderItem }) {
  const done = item.status === 'done'
  const standalone =
    findMenuItem(item.menuItemId)?.category === GARNISH_CATEGORY && !item.garnishId
  const garnishName = item.garnishName ?? findMenuItem(item.garnishId ?? '')?.name

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-8 shrink-0 text-[13.5px] font-bold tabular-nums text-foreground/85">
          {item.qty}×
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'text-[13.5px] font-semibold leading-snug',
                done && 'text-emerald-600 line-through',
              )}
            >
              {item.name}
            </span>
            {standalone ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Отдельно
              </span>
            ) : null}
          </span>
          {item.garnishId ? (
            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] leading-none text-muted-foreground">
              <CornerDownRight className="size-3 shrink-0" aria-hidden="true" />
              Гарнир: {garnishName}
            </span>
          ) : null}
        </span>
        <StatusBadge status={item.status} />
      </div>
      {item.comment ? (
        <p className="pl-10 pt-1 text-[11px] italic leading-snug text-amber-700">«{item.comment}»</p>
      ) : null}
    </div>
  )
}

/* ---------- карточка одной отправки ---------- */

function OrderCard({ order, now }: { order: Order; now: number }) {
  return (
    <article className="animate-fade-up rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-display text-[15px] font-bold tabular-nums leading-none">
          {formatClock(order.createdAt)}
        </span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {formatAgo(order.createdAt, now)}
        </span>
        {order.isAddition ? (
          <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Дозаказ
          </span>
        ) : null}
      </header>
      <div className="mt-2 divide-y divide-border/70">
        {order.items.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
      </div>
    </article>
  )
}

/* ---------- пилюля сводки ---------- */

function SummaryPill({
  icon: Icon,
  label,
  count,
  className,
}: {
  icon: LucideIcon
  label: string
  count: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label} {count}
    </span>
  )
}

/* ---------- экран «Заказы стола» ---------- */

export function TableOrders() {
  const selectedTable = usePosStore((s) => s.selectedTable)
  const orders = usePosStore((s) => s.orders)
  const setWaiterTab = usePosStore((s) => s.setWaiterTab)
  const archiveTable = usePosStore((s) => s.archiveTable)

  /* живое «N мин назад»: общий тик 1 с */
  const sec = useNowSeconds()
  const now = sec > 0 ? sec * 1000 : Date.now()

  const tableOrders = useMemo(
    () =>
      orders
        .filter((o) => o.tableNumber === selectedTable)
        .sort((a, b) => b.createdAt - a.createdAt),
    [orders, selectedTable],
  )

  const items = tableOrders.flatMap((o) => o.items)
  const queued = items.filter((i) => i.status === 'new').reduce((acc, i) => acc + i.qty, 0)
  const cooking = items.filter((i) => i.status === 'cooking').reduce((acc, i) => acc + i.qty, 0)
  const done = items.filter((i) => i.status === 'done').reduce((acc, i) => acc + i.qty, 0)
  const total = queued + cooking + done
  const hasActiveOrders = items.length > 0

  const handleArchive = () => {
    if (!hasActiveOrders) return
    if (window.confirm(`Рассчитать и закрыть стол ${selectedTable}? Заказы стола уйдут в архив.`)) {
      archiveTable(selectedTable)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* сводка статусов блюд стола */}
      {hasActiveOrders ? (
        <div className="animate-fade-up flex flex-wrap items-center gap-1.5">
          {queued > 0 ? (
            <SummaryPill
              icon={Clock3}
              label="В очереди"
              count={queued}
              className="border border-zinc-400/30 bg-zinc-500/10 text-zinc-600"
            />
          ) : null}
          {cooking > 0 ? (
            <SummaryPill
              icon={Flame}
              label="Готовится"
              count={cooking}
              className="border border-amber-500/30 bg-amber-500/15 text-amber-700"
            />
          ) : null}
          {done > 0 ? (
            <SummaryPill
              icon={CheckCheck}
              label="Готово"
              count={done}
              className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
            />
          ) : null}
          <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
            Всего {total} шт
          </span>
        </div>
      ) : null}

      {/* отправки: новейшая сверху */}
      {tableOrders.length > 0 ? (
        <div className="mt-3 space-y-3">
          {tableOrders.map((order) => (
            <OrderCard key={order.id} order={order} now={now} />
          ))}
        </div>
      ) : (
        <div className="animate-fade-up mx-auto flex max-w-sm flex-col items-center gap-2.5 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-secondary">
            <ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold">У стола {selectedTable} пока нет заказов</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Отправьте первый заказ из меню — здесь появятся его статусы с кухни
          </p>
          <button
            type="button"
            onClick={() => setWaiterTab('menu')}
            className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            К меню
          </button>
        </div>
      )}

      {/* фиксированная панель действий стола */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="safe-bottom mx-auto flex max-w-2xl gap-2.5 px-4 py-3">
          <button
            type="button"
            onClick={() => setWaiterTab('menu')}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-extrabold text-primary-foreground transition active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Plus className="size-4.5" aria-hidden="true" />
            Дозаказ
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={!hasActiveOrders}
            aria-label={`Рассчитать и закрыть стол ${selectedTable}`}
            className="inline-flex h-12 flex-[1.3] items-center justify-center gap-1.5 rounded-xl border border-red-300 px-3 text-[11.5px] font-bold text-red-600 transition hover:bg-red-500/10 active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:pointer-events-none disabled:opacity-40 sm:text-sm"
          >
            <Banknote className="size-4.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Рассчитать и закрыть стол</span>
          </button>
        </div>
      </div>
    </div>
  )
}
