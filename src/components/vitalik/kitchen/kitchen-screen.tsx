'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { activeOrders, formatClock, sortKitchenOrders } from '@/lib/derive'
import { haptic, playNewOrderBuzzer } from '@/lib/audio'
import type { KitchenMode, Order } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useNow } from '../use-now'
import { ConnectionBadge } from '../connection-badge'
import { RunnerBanner } from './runner-banner'
import { TicketCard } from './ticket-card'
import { StoplistTab } from './stoplist-tab'
import { BatchBoard } from './batch-board'
import { tableTitleOf } from './kitchen-utils'

/* ============================================================
   Экран «Шеф / Раздача» — финальная версия, 3 режима:
   📋 Заказы и Вынос · 🚫 Стоп-лист и Остатки · 📦 Батчинг.

   ТРЕВОГА НОВОГО ЗАКАЗА (во всех режимах): пока есть заказы
   со статусом sent — зуммер + вибро каждые 3 секунды и
   мерцание экрана; умолкает сразу после «ПРИНЯТЬ В РАБОТУ».
   ============================================================ */

const MODES: { key: KitchenMode; emoji: string; label: string }[] = [
  { key: 'tickets', emoji: '📋', label: 'Заказы и Вынос' },
  { key: 'stoplist', emoji: '🚫', label: 'Стоп-лист и Остатки' },
  { key: 'batch', emoji: '📦', label: 'Батчинг' },
]

export function KitchenScreen() {
  const kitchenMode = useAppStore((s) => s.kitchenMode)
  const setKitchenMode = useAppStore((s) => s.setKitchenMode)
  const soundEnabled = useAppStore((s) => s.soundEnabled)
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled)
  const connection = useAppStore((s) => s.connection)
  const orders = useAppStore((s) => s.orders)
  const now = useNow(1000)

  const active = activeOrders(orders ?? [])
  const pending = active.filter((o) => o.status === 'sent')
  const hasPending = pending.length > 0
  const hasVipPending = pending.some((o) => o.isVIP)
  const alarmOrder: Order | undefined =
    pending.length > 0 ? sortKitchenOrders(pending)[0] : undefined

  /* --- цикл зуммера: живёт только пока есть непринятые И включён звук --- */
  useEffect(() => {
    if (!hasPending || !soundEnabled) return
    const pattern: number[] = hasVipPending ? [30, 60, 30, 60, 30] : [25, 60, 25]
    playNewOrderBuzzer()
    haptic(pattern)
    const timer = setInterval(() => {
      playNewOrderBuzzer()
      haptic(pattern)
    }, 3000)
    return () => clearInterval(timer)
  }, [hasPending, hasVipPending, soundEnabled])

  const onToggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    // включение звука: разблокировка Web Audio + демонстрационный бип
    if (next) playNewOrderBuzzer()
  }

  return (
    <div className={cn('flex flex-col gap-3', hasPending && 'kitchen-alarm')}>
      {/* Тревожный баннер непринятого заказа — поверх всех режимов */}
      {alarmOrder && (
        <div className="pointer-events-none fixed inset-x-4 top-2 z-30">
          <div
            role="alert"
            className="mx-auto max-w-[520px] animate-pulse rounded-2xl bg-[#EF4444]/90 px-4 py-2.5 text-center shadow-lg shadow-red-500/30"
          >
            <p className="text-[16px] font-black uppercase leading-tight tracking-wide text-white">
              ⚠️ НОВЫЙ ЗАКАЗ · {tableTitleOf(alarmOrder)} — примите!
              {alarmOrder.isVIP ? ' ⭐ ВИП' : ''}
              {pending.length > 1 ? ` (ещё ${pending.length - 1})` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Шапка: бренд + живые часы + связь */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D4AF37]/15 text-lg"
            aria-hidden
          >
            👨‍🍳
          </span>
          <div className="leading-none">
            <div className="font-logo text-[20px] font-black tracking-tight text-[#D4AF37]">
              ВИТАЛИК · КУХНЯ
            </div>
            <div className="mt-1 text-[11px] font-bold tabular-nums text-zinc-500">
              {formatClock(now)} · смена идёт
            </div>
          </div>
        </div>
        <ConnectionBadge connection={connection} />
      </header>

      {/* Кнопка звука — крупная, янтарная */}
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? 'Звук включен — выключить' : 'Звук выключен — включить'}
        className={cn(
          'flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 text-[15px] font-black transition-all active:scale-[0.98]',
          soundEnabled
            ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-amber-300'
            : 'border-[#262B35] bg-[#161922] text-zinc-500',
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          {soundEnabled ? '🔔' : '🔕'}
        </span>
        {soundEnabled ? 'Звук включен' : 'Звук выключен'}
      </button>

      {/* Сегмент-контрол режимов */}
      <div
        role="tablist"
        aria-label="Режимы кухни"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
      >
        {MODES.map((mode) => {
          const selected = kitchenMode === mode.key
          return (
            <button
              key={mode.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setKitchenMode(mode.key)}
              className={cn(
                'flex h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 transition-all active:scale-[0.98]',
                selected
                  ? 'bg-[#F59E0B] text-[#201400] shadow-lg shadow-amber-500/25'
                  : 'text-zinc-400',
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {mode.emoji}
              </span>
              <span className="text-[10px] font-black uppercase leading-none tracking-tight">
                {mode.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Контент режима */}
      {kitchenMode === 'tickets' ? (
        <TicketsMode orders={active} now={now} />
      ) : kitchenMode === 'stoplist' ? (
        <StoplistTab />
      ) : (
        <BatchBoard orders={orders} />
      )}
    </div>
  )
}

/* ---------- Режим 1: «Заказы и Вынос» ---------- */

function TicketsMode({ orders, now }: { orders: Order[]; now: number }) {
  const readyOnPass = orders.filter((o) => o.status === 'ready')
  const inKitchen = sortKitchenOrders(
    orders.filter((o) => o.status === 'sent' || o.status === 'cooking'),
  )
  const cookingCount = orders.filter((o) => o.status === 'cooking').length
  const pendingCount = orders.filter((o) => o.status === 'sent').length

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-14 text-center">
        <div className="text-5xl" aria-hidden>
          🧑‍🍳
        </div>
        <div className="mt-3 text-lg font-extrabold text-zinc-300">
          Заказов нет — кухня свободна
        </div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Новый заказ объявит зуммер каждые 3 секунды
          <br />и красный баннер сверху — до нажатия «ПРИНЯТЬ».
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Блок ВЫНОС — сюда шеф зовёт раннера без телефона */}
      {readyOnPass.length > 0 && <RunnerBanner orders={readyOnPass} now={now} />}

      {/* Счётчики-пилюли */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Счётчики кухни">
        <span className="rounded-full bg-[#F59E0B]/15 px-3 py-1 text-[12px] font-black text-amber-300">
          В работе: {cookingCount}
        </span>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[12px] font-black text-emerald-300">
          На раздаче: {readyOnPass.length}
        </span>
        {pendingCount > 0 && (
          <span className="animate-pulse rounded-full bg-[#EF4444]/20 px-3 py-1 text-[12px] font-black text-red-400">
            Ждут приёма: {pendingCount}
          </span>
        )}
      </div>

      {/* Тикеты активных заказов */}
      {inKitchen.length === 0 ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.07] px-6 py-8 text-center">
          <div className="text-3xl" aria-hidden>
            🏃
          </div>
          <div className="mt-2 text-base font-extrabold text-emerald-300">
            Все тикеты закрыты — зовите раннеров
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            На раздаче ждут выноса: {readyOnPass.length}
          </div>
        </div>
      ) : (
        inKitchen.map((order) => <TicketCard key={order.id} order={order} now={now} />)
      )}
    </div>
  )
}
