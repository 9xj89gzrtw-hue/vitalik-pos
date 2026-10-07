'use client'

import { AlarmClock, CircleCheckBig, CircleDashed, Flame, Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  activeOrders,
  formatElapsed,
  minutesAgo,
  pluralDishes,
  pluralTables,
  servedToday,
  timerLevel,
} from '@/lib/derive'
import type { Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StageBar } from '../stage-bar'
import { useNow } from '../use-now'

/* ============================================================
   Вкладка «Где мой заказ?»: карточки столов с таймером,
   5-стадийной шкалой, галочками блюд и кнопкой «+ Дозаказ».
   ============================================================ */

export function StatusTab() {
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)
  const statusFilter = useAppStore((s) => s.statusFilter)
  const setStatusFilter = useAppStore((s) => s.setStatusFilter)
  const outbox = useAppStore((s) => s.outbox)
  const now = useNow()

  const active = activeOrders(orders)
  const mine = statusFilter === 'mine' ? active.filter((o) => !waiterName || o.waiterName === waiterName) : active
  // сначала «забрать с раздачи», затем по хронологии
  const sorted = [...mine].sort((a, b) => {
    if ((a.status === 'ready') !== (b.status === 'ready')) return a.status === 'ready' ? -1 : 1
    return a.sentAt - b.sentAt
  })
  const served = servedToday(orders)

  return (
    <div className="flex flex-col gap-3">
      {/* Фильтр */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#161B23] p-1">
        {(['mine', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            aria-pressed={statusFilter === f}
            className={cn(
              'h-11 rounded-xl text-[13px] font-extrabold transition-all',
              statusFilter === f ? 'bg-[#242B36] text-zinc-50' : 'text-zinc-400',
            )}
          >
            {f === 'mine' ? (waiterName ? `Мои столы (${mine.length})` : 'Мои столы') : `Все столы (${active.length})`}
          </button>
        ))}
      </div>

      {/* Офлайн-очередь: заказы, ждущие связи */}
      {outbox.length > 0 && (
        <div className="flex flex-col gap-2">
          {outbox.map((entry) => (
            <div
              key={entry.clientOrderId}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-yellow-400/40 bg-yellow-400/10 px-4 py-3"
            >
              <AlarmClock className="h-5 w-5 shrink-0 animate-pulse text-yellow-300" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold text-yellow-300">
                  Ждёт связи · {entry.tableLabel}
                </div>
                <div className="text-[11px] font-semibold text-yellow-200/60">
                  {pluralDishes(entry.pieces)} · уйдут на кухню автоматически
                </div>
              </div>
              <button
                type="button"
                onClick={() => useAppStore.getState().cancelOutboxEntry(entry.clientOrderId)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-yellow-200/60 active:bg-white/10"
              >
                Отменить
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Карточки заказов */}
      {sorted.length === 0 && outbox.length === 0 && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#161B23] px-6 py-10 text-center">
          <div className="text-4xl">📍</div>
          <div className="mt-3 text-[15px] font-bold text-zinc-300">Пока нет активных заказов</div>
          <div className="mt-1 text-xs leading-relaxed text-zinc-500">
            Отправьте заказ из вкладки «Меню и Корзина» — и здесь появится вся его жизнь:
            от «Отправлен» до «Отдано в зал».
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((order) => (
          <OrderCard key={order.id} order={order} now={now} />
        ))}
      </div>

      {served.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#161B23] px-4 py-3 text-center text-xs font-semibold text-zinc-500">
          Сегодня обслужено и отдано: {pluralTables(served.length)} ·{' '}
          {pluralDishes(served.reduce((acc, o) => acc + o.items.reduce((a, i) => a + i.qty, 0), 0))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, now }: { order: Order; now: number }) {
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const setWaiterTab = useAppStore((s) => s.setWaiterTab)
  const isMine = useAppStore((s) => !s.waiterName || order.waiterName === s.waiterName)

  const elapsed = now - order.sentAt
  const level = timerLevel(elapsed)
  const ready = order.status === 'ready'
  const sent = order.status === 'sent'

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-[#161B23] p-4',
        ready
          ? 'border-emerald-400/60 shadow-[0_0_28px_-6px_rgba(16,185,129,0.45)]'
          : order.isVIP
            ? 'vip-frame'
            : 'border-white/[0.07]',
      )}
    >
      {ready && (
        <div className="ready-strip" aria-hidden>
          <span className="relative z-10">🟢 ЗАБРАТЬ С РАЗДАЧИ! Блюда стоят у окна выдачи</span>
        </div>
      )}

      <div className={cn('flex items-start justify-between gap-3', ready && 'pt-1')}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-xl font-black leading-none text-zinc-50">
              {order.tableLabel}
            </h4>
            {order.isVIP && (
              <span className="vip-chip">⚡ ВИП</span>
            )}
            {order.addendumCount > 0 && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
                +{order.addendumCount} дозаказ
              </span>
            )}
          </div>
          <div className="mt-1.5 text-xs font-semibold text-zinc-500">
            {isMine ? 'Вы' : order.waiterName} · отправлен {minutesAgo(order.sentAt, now)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              'font-display text-xl font-black tabular-nums leading-none',
              level === 'ok' && 'text-emerald-400',
              level === 'warn' && 'text-amber-400',
              level === 'late' && 'animate-pulse text-red-400',
            )}
          >
            ⏱ {formatElapsed(elapsed)}
          </div>
          {level === 'late' && (
            <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-red-400">
              внимание!
            </div>
          )}
        </div>
      </div>

      {/* 5-стадийная шкала */}
      <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#0F1115] px-2 py-3">
        <StageBar order={order} />
        {sent && (
          <div className="mt-2 text-center text-[11px] font-bold text-yellow-300/90">
            <span className="animate-pulse">●</span> Ждёт подтверждения кухни — чек ушёл, всё под контролем
          </div>
        )}
      </div>

      {/* Комментарий к столу */}
      {order.tableNote && (
        <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-300">
          💬 {order.tableNote}
        </div>
      )}

      {/* Состав заказа */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600">
          Блюда · {pluralDishes(order.items.reduce((acc, i) => acc + i.qty, 0))}
        </div>
        <ul className="flex flex-col gap-1">
          {order.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      </div>

      {/* Дозаказ */}
      <button
        type="button"
        onClick={() => {
          setSelectedTable(order.tableId)
          setWaiterTab('menu')
        }}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 text-[14px] font-extrabold text-amber-300 transition-all active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Дозаказ к {order.tableLabel}
      </button>
    </article>
  )
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl bg-[#0F1115] px-3 py-2">
      <span className="mt-0.5 shrink-0" aria-label={statusText(item.status)}>
        {item.status === 'ready' ? (
          <CircleCheckBig className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
        ) : item.status === 'cooking' ? (
          <Flame className="h-5 w-5 animate-pulse text-amber-400" />
        ) : (
          <CircleDashed className="h-5 w-5 text-zinc-600" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-[13.5px] font-bold leading-snug',
            item.status === 'ready' ? 'text-emerald-300' : 'text-zinc-200',
          )}
        >
          {item.qty}× {item.name}
          {item.isAddendum && (
            <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
              дозаказ
            </span>
          )}
        </div>
        {item.garnishId && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">
            ↳ Гарнир: {item.garnishName}
          </div>
        )}
        {item.standalone && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">↳ отдельное блюдо</div>
        )}
        {item.comment && (
          <div className="mt-0.5 text-[11.5px] font-bold text-amber-300/90">❗ {item.comment}</div>
        )}
      </div>
      <span className="mt-0.5 shrink-0 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {statusText(item.status)}
      </span>
    </li>
  )
}

function statusText(status: OrderItem['status']): string {
  switch (status) {
    case 'queued':
      return 'в очереди'
    case 'cooking':
      return 'готовится'
    case 'ready':
      return 'готово'
  }
}
