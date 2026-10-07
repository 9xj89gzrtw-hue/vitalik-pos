'use client'

import { Timer } from 'lucide-react'
import { formatElapsed, timerLevel, type TimerLevel } from '@/lib/derive'
import { cn } from '@/lib/utils'
import { useNowSeconds } from './use-now'

const LEVEL_STYLES: Record<TimerLevel, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400',
  warn: 'bg-amber-500/15 text-amber-400',
  late: 'bg-red-500/15 text-red-400 animate-breathe',
}

/** Таймер тикета: локальная подписка на общий тик 1 с */
export function TicketTimer({ startedAt }: { startedAt: number }) {
  const nowSeconds = useNowSeconds()
  const elapsedMs = nowSeconds > 0 ? nowSeconds * 1000 - startedAt : 0
  const level = timerLevel(elapsedMs)
  const label = nowSeconds > 0 ? formatElapsed(elapsedMs) : '--:--'

  return (
    <span
      role="timer"
      aria-label={`Время за столом: ${label}`}
      className={cn(
        'font-display inline-flex gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums whitespace-nowrap',
        LEVEL_STYLES[level],
      )}
    >
      <Timer className="size-3.5" strokeWidth={2.2} />
      {label}
    </span>
  )
}
