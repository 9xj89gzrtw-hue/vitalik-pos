'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { activeOrders } from '@/lib/derive'
import { cn } from '@/lib/utils'
import { RunnerBanner } from './runner-banner'
import { TicketCard } from './ticket-card'
import { BatchBoard } from './batch-board'

/* ============================================================
   Экран «Кухня / Раздача» для руководителя кухни.
   Режимы: Тикеты и Раздача (основной) | Сводка цехов (батчинг).
   ============================================================ */

function useClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function KitchenScreen() {
  const kitchenMode = useAppStore((s) => s.kitchenMode)
  const setKitchenMode = useAppStore((s) => s.setKitchenMode)
  const soundEnabled = useAppStore((s) => s.soundEnabled)
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled)
  const connection = useAppStore((s) => s.connection)
  const orders = useAppStore((s) => s.orders)
  const now = useClock()

  const active = activeOrders(orders)
  const clock = new Date(now).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex flex-col gap-3">
      {/* Шапка кухни */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg shadow-lg shadow-orange-500/20">
            👨‍🍳
          </span>
          <div className="leading-none">
            <div className="font-display text-[19px] font-extrabold tracking-tight text-zinc-50">
              Кухня / Раздача
            </div>
            <div className="mt-1 font-display text-[11px] font-bold tabular-nums text-zinc-500">
              {clock}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connection !== 'online' && (
            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
              офлайн
            </span>
          )}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            className={cn(
              'grid h-11 w-11 place-items-center rounded-2xl border transition-all active:scale-95',
              soundEnabled
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                : 'border-white/10 bg-[#161B23] text-zinc-500',
            )}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Режимы */}
      <div className="sticky top-0 z-30 -mx-4 bg-[#0F1115]/95 px-4 py-2 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#161B23] p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={kitchenMode === 'tickets'}
            onClick={() => setKitchenMode('tickets')}
            className={cn(
              'flex h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-extrabold transition-all',
              kitchenMode === 'tickets'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400',
            )}
          >
            <span className="text-base leading-none">🎫</span>
            <span className="leading-none">Тикеты и раздача</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kitchenMode === 'batch'}
            onClick={() => setKitchenMode('batch')}
            className={cn(
              'flex h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-extrabold transition-all',
              kitchenMode === 'batch'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400',
            )}
          >
            <span className="text-base leading-none">📊</span>
            <span className="leading-none">Сводка цехов</span>
          </button>
        </div>
      </div>

      {kitchenMode === 'tickets' ? (
        <TicketsMode now={now} />
      ) : (
        <BatchBoard orders={active} />
      )}
    </div>
  )
}

function TicketsMode({ now }: { now: number }) {
  const orders = useAppStore((s) => s.orders)
  const active = activeOrders(orders)
  const ready = active.filter((o) => o.status === 'ready')
  const pending = active.filter((o) => o.status === 'sent' || o.status === 'cooking')

  if (active.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.06] bg-[#161B23] px-6 py-12 text-center">
        <div className="text-5xl">🔥</div>
        <div className="mt-3 font-display text-lg font-extrabold text-zinc-300">
          Тишина на кухне
        </div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Новые заказы появятся здесь с громким сигналом.
          <br />
          Планка цеха и раздача готовы к смене.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {ready.length > 0 && <RunnerBanner orders={ready} />}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          {pending
            .sort((a, b) => {
              if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1
              return a.sentAt - b.sentAt
            })
            .map((order) => (
              <TicketCard key={order.id} order={order} now={now} />
            ))}
        </div>
      )}
    </div>
  )
}
