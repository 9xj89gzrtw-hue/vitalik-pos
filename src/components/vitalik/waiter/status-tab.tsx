'use client'

import { Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { activeOrders, minutesAgo } from '@/lib/derive'
import type { Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StageBar } from '../stage-bar'
import { useNow } from '../use-now'

/* ============================================================
   Вкладка «Статус стола»: фильтр Мои/Все, карточки активных
   заказов с 3-стадийной шкалой и статусами блюд, офлайн-очередь.
   served-заказы не показываются (они в «Аналитике»).
   ============================================================ */

export function StatusTab() {
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)
  const statusFilter = useAppStore((s) => s.statusFilter)
  const setStatusFilter = useAppStore((s) => s.setStatusFilter)
  const outbox = useAppStore((s) => s.outbox)
  const cancelOutboxEntry = useAppStore((s) => s.cancelOutboxEntry)
  const setWaiterTab = useAppStore((s) => s.setWaiterTab)

  const now = useNow(1000)

  const active = activeOrders(orders ?? [])
  const mine =
    statusFilter === 'mine'
      ? active.filter((o) => !waiterName || o.waiterName === waiterName)
      : active
  // сначала «забрать с раздачи», затем по хронологии
  const sorted = [...mine].sort((a, b) => {
    if ((a.status === 'ready') !== (b.status === 'ready')) return a.status === 'ready' ? -1 : 1
    return a.sentAt - b.sentAt
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Фильтр Мои / Все */}
      <div
        className="grid grid-cols-2 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
        role="group"
        aria-label="Фильтр заказов"
      >
        <button
          type="button"
          aria-pressed={statusFilter === 'mine'}
          onClick={() => setStatusFilter('mine')}
          className={filterBtnClass(statusFilter === 'mine')}
        >
          Мои{mine.length > 0 ? ` (${mine.length})` : ''}
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          className={filterBtnClass(statusFilter === 'all')}
        >
          Все{active.length > 0 ? ` (${active.length})` : ''}
        </button>
      </div>

      {/* Офлайн-очередь: заказы, ждущие связи */}
      {outbox.map((entry) => (
        <div
          key={entry.clientOrderId}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-2.5"
          role="status"
        >
          <span className="animate-pulse text-xl leading-none" aria-hidden>
            ⏳
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-extrabold text-[#F59E0B]">
              Ждёт связи · {entry.tableLabel} · {entry.pieces} шт
            </div>
            <div className="text-[11px] font-semibold leading-relaxed text-amber-200/60">
              Уйдёт на кухню автоматически при восстановлении связи
            </div>
          </div>
          <button
            type="button"
            onClick={() => cancelOutboxEntry(entry.clientOrderId)}
            className="flex h-11 shrink-0 items-center rounded-xl px-3 text-[12px] font-bold text-amber-200/70 transition-all active:scale-[0.98] active:bg-white/10"
            aria-label={`Отменить заказ «${entry.tableLabel}»`}
          >
            Отменить
          </button>
        </div>
      ))}

      {/* Карточки заказов / пустое состояние */}
      {sorted.length === 0 && outbox.length === 0 ? (
        <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-10 text-center">
          <div className="text-4xl" aria-hidden>
            📋
          </div>
          <div className="mt-3 text-[15px] font-bold text-[#F5F1E8]">Заказов нет</div>
          <div className="mt-1 text-xs leading-relaxed text-zinc-500">
            Выберите блюда во вкладке «Меню»
          </div>
          <button
            type="button"
            onClick={() => setWaiterTab('menu')}
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] text-[14px] font-extrabold text-[#14100A] transition-all active:scale-[0.98]"
          >
            К меню
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((order) => (
            <OrderCard key={order.id} order={order} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}

function filterBtnClass(active: boolean): string {
  return cn(
    'flex h-12 items-center justify-center rounded-xl text-[13.5px] font-extrabold transition-all active:scale-[0.98]',
    active ? 'bg-[#D4AF37] text-[#14100A]' : 'text-zinc-400',
  )
}

/* ---------- карточка активного заказа ---------- */

function OrderCard({ order, now }: { order: Order; now: number }) {
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const setWaiterTab = useAppStore((s) => s.setWaiterTab)
  const waiterName = useAppStore((s) => s.waiterName)

  const ready = order.status === 'ready'
  const pieces = (order.items ?? []).reduce((acc, i) => acc + i.qty, 0)
  const mine = !waiterName || order.waiterName === waiterName

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-[#161922] p-4',
        ready
          ? 'animate-pulse-bg border-[#10B981]/50'
          : order.isVIP
            ? 'vip-frame'
            : 'border-[#262B35]',
      )}
    >
      {ready && (
        <div className="ready-strip" aria-hidden>
          🟢 ЗАБРАТЬ С РАЗДАЧИ!
        </div>
      )}

      {/* Шапка: стол, ВИП, официант, живое время */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-black leading-none text-[#F5F1E8]">{order.tableLabel}</h4>
            {order.isVIP && <span className="vip-chip">⭐ ВИП</span>}
            <span className="rounded-full bg-[#232936] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
              {mine ? 'Вы' : order.waiterName}
            </span>
          </div>
          <div className="mt-1.5 text-xs font-semibold text-zinc-500">
            Отправлен {minutesAgo(order.sentAt, now)}
          </div>
        </div>
        <div className="shrink-0 text-right leading-none">
          <div className="text-[13px] font-black tabular-nums text-zinc-300">{pieces} шт</div>
          {order.addendumCount > 0 && (
            <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#F59E0B]">
              +{order.addendumCount} дозаказ
            </div>
          )}
        </div>
      </div>

      {/* 3-стадийная шкала */}
      <div className="mt-3 rounded-2xl border border-[#262B35] bg-[#0D0F12] px-2 py-3">
        <StageBar order={order} />
      </div>

      {/* Комментарий к столу */}
      {order.tableNote && (
        <div className="mt-3 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#F59E0B]">
          💬 {order.tableNote}
        </div>
      )}

      {/* Блюда с индивидуальными статусами */}
      <ul className="mt-3 flex flex-col gap-1">
        {(order.items ?? []).map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>

      {/* Дозаказ */}
      <button
        type="button"
        onClick={() => {
          setSelectedTable(order.tableId)
          setWaiterTab('menu')
        }}
        aria-label={`Дозаказ к ${order.tableLabel}`}
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[14px] font-extrabold text-[#F59E0B] transition-all active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Дозаказ
      </button>
    </article>
  )
}

/* ---------- строка блюда заказа ---------- */

const ITEM_STATUS: Record<OrderItem['status'], { icon: string; label: string }> = {
  queued: { icon: '⏳', label: 'в очереди' },
  cooking: { icon: '🔥', label: 'готовится' },
  ready: { icon: '✅', label: 'готово' },
}

function ItemRow({ item }: { item: OrderItem }) {
  const st = ITEM_STATUS[item.status] ?? ITEM_STATUS.queued
  return (
    <li className="flex items-start gap-2.5 rounded-xl bg-[#0D0F12] px-3 py-2">
      <span className="mt-0.5 shrink-0 text-base leading-none" role="img" aria-label={st.label}>
        {st.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-[13.5px] font-bold leading-snug',
            item.status === 'ready' ? 'text-emerald-400 line-through' : 'text-[#F5F1E8]',
          )}
        >
          {item.qty}× {item.name}
          {item.isAddendum && (
            <span className="ml-2 rounded bg-[#F59E0B]/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#F59E0B]">
              дозаказ
            </span>
          )}
        </div>
        {item.garnishId && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">
            + {item.garnishName ?? 'гарнир'}
          </div>
        )}
        {item.standalone && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">гарнир отдельно</div>
        )}
        {item.comment && (
          <div className="mt-0.5 text-[11.5px] italic text-[#F59E0B]">{item.comment}</div>
        )}
      </div>
    </li>
  )
}
