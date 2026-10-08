'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { usePersistedState, useVitalik } from '@/lib/api-client'
import { haptic, playNewOrderBuzzer, playVipOrderBeep } from '@/lib/audio'
import { formatClock, sortOrders } from '@/lib/derive'
import type { KitchenMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useNow } from '../use-now'
import { BatchBoard } from './batch-board'
import { StoplistTab } from './stoplist-tab'
import { TicketsTab } from './tickets-tab'

/* ============================================================
   Экран 2 — ШЕФ / РАЗДАЧА (кухня, 3 повара, раннеры без телефонов):
   [📦 Сводка цехов и Батчинг] | [📋 Заказы по столам] | [🚫 Стоп-лист]

   ТРЕВОГА НОВОГО ЗАКАЗА (во всех режимах): пока есть непринятые
   заказы — циклический зуммер каждые 3 секунды + вибро + мерцание
   экрана; умолкает сразу после «ПРИНЯТЬ».
   ============================================================ */

const MODES: { key: KitchenMode; emoji: string; label: string }[] = [
  { key: 'batch', emoji: '📦', label: 'Сводка и Батчинг' },
  { key: 'tickets', emoji: '📋', label: 'Заказы по столам' },
  { key: 'stoplist', emoji: '🚫', label: 'Стоп-лист' },
]

export function KitchenScreen() {
  const { state, mutate, synced } = useVitalik()
  const [mode, setMode] = usePersistedState<KitchenMode>('vitalik_pos_kitchen_mode', 'batch')
  const [soundOn, setSoundOn] = usePersistedState<boolean>('vitalik_pos_sound', false)
  const [accepting, setAccepting] = useState(false)
  const now = useNow(1000)

  const orders = state?.orders ?? []
  const pending = orders.filter((o) => !o.acknowledged)
  const hasPending = pending.length > 0
  const hasVipPending = pending.some((o) => o.vip)
  const alarmOrder = pending.length > 0 ? sortOrders(pending)[0] : undefined

  /* --- цикл зуммера: живёт только пока есть непринятые И включён звук --- */
  useEffect(() => {
    if (!hasPending || !soundOn) return
    const buzz = () => {
      if (hasVipPending) playVipOrderBeep()
      else playNewOrderBuzzer()
      haptic(hasVipPending ? [30, 60, 30, 60, 30] : [25, 60, 25])
    }
    buzz()
    const timer = setInterval(buzz, 3000)
    return () => clearInterval(timer)
  }, [hasPending, hasVipPending, soundOn])

  const onToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    if (next) {
      // разблокировка Web Audio на iOS/Android + демонстрационный сигнал
      playNewOrderBuzzer()
      haptic(20)
      toast.success('Звук разблокирован — кухня услышит новые заказы')
    }
  }

  const accept = async () => {
    if (accepting) return
    setAccepting(true)
    haptic([15, 30])
    await mutate('/api/orders', { action: 'acknowledge' })
    setAccepting(false)
  }

  return (
    <div className={cn('flex flex-col gap-3', hasPending && 'kitchen-alarm')}>
      {/* Тревожный баннер непринятого заказа — поверх всех режимов */}
      {alarmOrder && (
        <div className="pointer-events-none fixed inset-x-4 top-2 z-30">
          <div
            role="alert"
            className="mx-auto flex max-w-[520px] items-center gap-3 rounded-2xl border-2 border-[#EF4444] bg-[#EF4444]/90 px-4 py-2.5 shadow-lg shadow-red-500/30"
          >
            <p className="min-w-0 flex-1 truncate text-[14px] font-black uppercase leading-tight tracking-wide text-white">
              ⚠️ НОВЫЙ ЗАКАЗ · СТОЛ {alarmOrder.table} — {alarmOrder.waiter}
              {alarmOrder.vip ? ' · ⭐ВИП' : ''}
              {pending.length > 1 ? ` (+${pending.length - 1})` : ''}
            </p>
            <button
              type="button"
              onClick={() => void accept()}
              disabled={accepting}
              className="pointer-events-auto h-[44px] shrink-0 rounded-xl bg-white px-4 text-[14px] font-black text-[#EF4444] active:scale-95 disabled:opacity-50"
            >
              ПРИНЯТЬ ✋
            </button>
          </div>
        </div>
      )}

      {/* Шапка */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D4AF37]/15 text-lg" aria-hidden>
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
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            synced ? 'bg-emerald-500/70' : 'animate-pulse bg-amber-500/80',
          )}
          title={synced ? 'Синхронизировано' : 'Возобновляем связь…'}
          aria-hidden
        />
      </header>

      {/* Кнопка звука — крупная, разблокирует Web Audio на телефоне шефа */}
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Звук включен — выключить' : 'Звук выключен — включить'}
        className={cn(
          'flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 text-[15px] font-black transition-all active:scale-[0.98]',
          soundOn
            ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-amber-300'
            : 'border-[#262B35] bg-[#161922] text-zinc-500',
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          {soundOn ? '🔔' : '🔕'}
        </span>
        {soundOn ? 'Звук включен' : '🔔 Звук включен — тап для разблокировки'}
      </button>

      {/* Сегмент-контрол режимов */}
      <div
        role="tablist"
        aria-label="Режимы кухни"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
      >
        {MODES.map((m) => {
          const selected = mode === m.key
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(m.key)}
              className={cn(
                'flex h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 transition-all active:scale-[0.98]',
                selected
                  ? 'bg-[#F59E0B] text-[#201400] shadow-lg shadow-amber-500/25'
                  : 'text-zinc-400',
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-[10px] font-black uppercase leading-none tracking-tight">
                {m.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Контент режима */}
      {mode === 'batch' ? (
        <BatchBoard orders={orders} />
      ) : mode === 'tickets' ? (
        <TicketsTab orders={orders} now={now} />
      ) : (
        <StoplistTab />
      )}
    </div>
  )
}
