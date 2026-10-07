'use client'

import { Fragment } from 'react'
import { Check } from 'lucide-react'
import type { Order, StageKey } from '@/lib/types'
import { formatClock, orderStages } from '@/lib/derive'
import { cn } from '@/lib/utils'

/* ============================================================
   5-стадийная шкала «Анти-паника»:
   🟡 Отправлен → 🔵 Принят шефом → 🟠 Готовится → 🟢 На раздаче → ⚪ Отдано
   ============================================================ */

const STAGE_STYLE: Record<StageKey, { dot: string; label: string }> = {
  sent: { dot: 'bg-yellow-400 text-black', label: 'text-yellow-300' },
  accepted: { dot: 'bg-sky-400 text-black', label: 'text-sky-300' },
  cooking: { dot: 'bg-amber-500 text-black', label: 'text-amber-400' },
  ready: { dot: 'bg-emerald-500 text-black', label: 'text-emerald-300' },
  served: { dot: 'bg-zinc-600 text-white', label: 'text-zinc-400' },
}

const STAGE_ICONS: Record<StageKey, string> = {
  sent: '📨',
  accepted: '👨‍🍳',
  cooking: '🔥',
  ready: '🛎',
  served: '✓',
}

function stageCssColor(key: StageKey): string {
  switch (key) {
    case 'sent':
      return '#FACC15'
    case 'accepted':
      return '#38BDF8'
    case 'cooking':
      return '#F59E0B'
    case 'ready':
      return '#10B981'
    case 'served':
      return '#71717A'
  }
}

function activeRing(key: StageKey): string {
  switch (key) {
    case 'sent':
      return 'ring-yellow-400/40'
    case 'cooking':
      return 'ring-amber-500/40'
    case 'ready':
      return 'ring-emerald-500/40'
    default:
      return 'ring-white/20'
  }
}

export function StageBar({ order }: { order: Order }) {
  const stages = orderStages(order)
  return (
    <div className="flex w-full items-start">
      {stages.map((s, i) => {
        const style = STAGE_STYLE[s.key]
        const connected = i > 0 && stages[i - 1].reached && s.reached
        return (
          <Fragment key={s.key}>
            {i > 0 && (
              <div
                className="mt-[11px] h-[3px] min-w-1.5 flex-1 rounded-full"
                style={{
                  background: connected ? stageCssColor(s.key) : '#242B35',
                  opacity: connected ? 0.45 : 1,
                }}
              />
            )}
            <div className="flex w-[54px] shrink-0 flex-col items-center gap-1">
              <div
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-[10px] font-black transition-all',
                  s.reached ? style.dot : 'bg-[#232A33] text-zinc-600',
                  s.active && cn('animate-pulse ring-4', activeRing(s.key)),
                )}
                aria-label={s.label}
              >
                {s.reached && !s.active ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : STAGE_ICONS[s.key]}
              </div>
              <div className="text-center leading-none">
                <div
                  className={cn(
                    'text-[8.5px] font-bold uppercase tracking-wide',
                    s.reached ? style.label : 'text-zinc-600',
                  )}
                >
                  {s.label}
                </div>
                {s.reached && s.time != null && (
                  <div className="mt-0.5 text-[8px] font-semibold tabular-nums text-zinc-500">
                    {formatClock(s.time)}
                  </div>
                )}
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
