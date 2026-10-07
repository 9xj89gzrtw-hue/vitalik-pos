'use client'

import { useNowSeconds } from './use-now'

/** Живые часы HH:MM:SS — подписка на общий тик, без перерисовки доски */
export function LiveClock() {
  const seconds = useNowSeconds()
  const date = seconds > 0 ? new Date(seconds * 1000) : null

  return (
    <time
      dateTime={date ? date.toISOString() : undefined}
      className="font-display text-foreground text-lg font-bold tabular-nums leading-none whitespace-nowrap"
    >
      {date ? date.toLocaleTimeString('ru-RU', { hour12: false }) : '--:--:--'}
    </time>
  )
}
