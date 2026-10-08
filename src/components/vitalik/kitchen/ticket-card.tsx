'use client'

import { Check, ChefHat, Lock } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { buildKitchenTicket, formatClock, formatElapsed, timerLevel } from '@/lib/derive'
import type { Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { tableTitleOf } from './kitchen-utils'

/* ============================================================
   Тикет заказа на кухне — читается с 1 метра.
   sent    → янтарная пульсация, «ждёт N», [ПРИНЯТЬ В РАБОТУ].
   cooking → таймер готовки, строки-кнопки [ГОТОВО!] ↔ откат.
   Когда всё готово — заказ уходит в блок ВЫНОС (родитель).
   ============================================================ */

export function TicketCard({ order, now }: { order: Order; now: number }) {
  const flash = useAppStore((s) => s.flash[order.id] ?? 0)
  const acceptOrder = useAppStore((s) => s.acceptOrder)
  const toggleItem = useAppStore((s) => s.toggleItem)

  const sent = order.status === 'sent'
  const startedAt = sent ? order.sentAt : (order.acceptedAt ?? order.sentAt)
  const elapsed = Math.max(0, now - startedAt)
  const level = timerLevel(elapsed)
  const isNew = flash > now
  const { groups, addendumItems } = buildKitchenTicket(order)

  const timerBox =
    level === 'ok'
      ? 'bg-emerald-500/15'
      : level === 'warn'
        ? 'bg-amber-500/15'
        : 'bg-red-500/20 animate-pulse'
  const timerText = sent
    ? 'text-amber-400'
    : level === 'ok'
      ? 'text-emerald-400'
      : level === 'warn'
        ? 'text-amber-400'
        : 'text-red-400'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl bg-[#161922]',
        order.isVIP ? 'vip-frame' : 'border border-[#262B35]',
        sent && 'animate-pulse-bg',
        isNew && !sent && 'ring-2 ring-[#D4AF37]/60',
      )}
    >
      {/* Шапка: СТОЛ №N + таймер */}
      <header
        className={cn(
          'flex items-start justify-between gap-3 border-b border-[#262B35] px-4 py-3',
          order.isVIP && 'bg-gradient-to-r from-[#3A2412]/50 to-transparent',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-3xl font-black uppercase leading-none tracking-tight text-[#F5F1E8]">
              {tableTitleOf(order)}
            </h3>
            {order.isVIP && <span className="vip-chip">⭐ ВИП СТОЛ</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-bold text-zinc-400">
            <span className="rounded-lg bg-[#232936] px-2 py-1 text-[15px] font-bold text-zinc-200">
              {order.waiterName}
            </span>
            <span className="tabular-nums text-zinc-500">отправлен {formatClock(order.sentAt)}</span>
            {order.addendumCount > 0 && (
              <span className="rounded-lg bg-[#F59E0B]/15 px-2 py-1 text-amber-300">
                +{order.addendumCount} дозаказ
              </span>
            )}
          </div>
        </div>
        <div className={cn('shrink-0 rounded-2xl px-3 py-2 text-center', timerBox)}>
          <div className={cn('text-2xl font-black tabular-nums leading-none', timerText)}>
            {formatElapsed(elapsed)}
          </div>
          <div
            className={cn(
              'mt-1 text-[9px] font-black uppercase tracking-widest',
              sent ? 'text-amber-400/80' : level === 'late' ? 'text-red-400/80' : 'text-zinc-500',
            )}
          >
            {sent ? 'ждёт' : level === 'late' ? 'опоздание!' : 'готовка'}
          </div>
        </div>
      </header>

      {/* Комментарий к столу — заметный янтарный колл-аут */}
      {order.tableNote && (
        <div className="border-b border-[#262B35] border-l-4 border-l-[#F59E0B] bg-[#F59E0B]/10 px-4 py-2.5 text-[14px] font-extrabold leading-snug text-amber-300">
          💬 {order.tableNote}
        </div>
      )}

      {/* Позиции по цехам */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h4 className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
              <span className="h-[2px] w-3 rounded-full bg-zinc-600" aria-hidden />
              {group.title}
              <span className="ml-auto rounded-md bg-[#232936] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-400">
                {group.items.reduce((acc, i) => acc + i.qty, 0)} шт
              </span>
            </h4>
            <ul className="flex flex-col gap-2">
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

        {/* Блок ДОЗАКАЗ */}
        {addendumItems.length > 0 && (
          <section
            className="rounded-2xl border border-dashed border-[#F59E0B]/45 bg-[#F59E0B]/[0.06] p-2.5"
            aria-label="Дозаказ к столу"
          >
            <h4 className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
              <span className="h-[2px] w-3 rounded-full bg-[#F59E0B]/60" aria-hidden />
              ДОЗАКАЗ
              <span className="ml-auto rounded-md bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-300">
                {addendumItems.reduce((acc, i) => acc + i.qty, 0)} шт
              </span>
            </h4>
            <ul className="flex flex-col gap-2">
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

      {/* Действие шефа: принять новый заказ */}
      {sent && (
        <div className="border-t border-[#262B35] p-3">
          <button
            type="button"
            onClick={() => void acceptOrder(order.id)}
            aria-label={`Принять в работу — ${order.tableLabel}`}
            className="flex h-[64px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#F59E0B] text-[17px] font-black text-[#201400] shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
          >
            <ChefHat className="h-6 w-6" strokeWidth={2.5} aria-hidden />
            ПРИНЯТЬ В РАБОТУ
            <span className="text-[12px] font-bold opacity-60">официант сразу увидит</span>
          </button>
        </div>
      )}
    </article>
  )
}

/* Строка блюда: ОЧЕНЬ КРУПНЫЙ текст, тап = готово, повторный тап = откат */
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
        aria-label={`${item.qty} × ${item.name}${ready ? ' — готово, тап вернёт в работу' : ' — отметить готовым'}`}
        className={cn(
          'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all',
          locked ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.98]',
          ready
            ? 'border-emerald-500/50 bg-emerald-500/15'
            : 'border-[#262B35] bg-[#0F1115]',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                'text-xl font-black leading-tight',
                ready ? 'text-emerald-300 line-through decoration-[3px]' : 'text-[#F5F1E8]',
              )}
            >
              {item.qty}× {item.name}
            </span>
            {item.isAddendum && (
              <span className="rounded-full bg-[#F59E0B]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
                ДОЗАКАЗ
              </span>
            )}
          </span>
          {item.garnishId && (
            <span className="mt-0.5 block text-base font-semibold text-zinc-400">
              + {item.garnishName}
            </span>
          )}
          {item.standalone && (
            <span className="mt-0.5 block text-sm font-bold text-zinc-500">
              гарнир отдельным блюдом
            </span>
          )}
          {item.comment && (
            <span className="mt-0.5 block text-base font-extrabold text-amber-300">
              «{item.comment}»
            </span>
          )}
        </span>

        {/* Правый край: замок (ждёт) / ГОТОВО! / ✓ с откатом */}
        {locked ? (
          <span className="flex shrink-0 flex-col items-center gap-1 text-zinc-600">
            <Lock className="h-5 w-5" aria-hidden />
            <span className="text-[9px] font-black uppercase tracking-wide">ждёт</span>
          </span>
        ) : ready ? (
          <span className="flex shrink-0 flex-col items-center gap-0.5" aria-hidden>
            <Check className="h-8 w-8 text-emerald-400" strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-wide text-emerald-400/80">
              тап — вернуть
            </span>
          </span>
        ) : (
          <span className="grid h-[52px] w-[108px] shrink-0 place-items-center rounded-xl bg-emerald-500 text-[15px] font-black text-[#05140E]">
            ГОТОВО!
          </span>
        )}
      </button>
    </li>
  )
}
