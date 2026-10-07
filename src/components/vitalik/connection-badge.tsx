'use client'

import { cn } from '@/lib/utils'
import type { ConnectionState } from '@/lib/types'

/* Индикатор связи: онлайн / офлайн (заказы копятся в телефоне) */

export function ConnectionBadge({ connection, className }: { connection: ConnectionState; className?: string }) {
  if (connection === 'online') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400',
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Онлайн
      </span>
    )
  }
  if (connection === 'offline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400',
          className,
        )}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        Офлайн · копим
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-zinc-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
      Связь…
    </span>
  )
}
