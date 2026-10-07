'use client'

import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Точка-индикатор состояния соединения с сервисом зала⇄кухни */
export function ConnectionDot({ withLabel = true }: { withLabel?: boolean }) {
  const connection = usePosStore((s) => s.connection)
  const cfg =
    connection === 'online'
      ? { dot: 'bg-emerald-500', label: 'Онлайн', text: 'text-emerald-600 dark:text-emerald-400' }
      : connection === 'connecting'
        ? { dot: 'bg-amber-500 animate-breathe', label: 'Связь…', text: 'text-amber-600 dark:text-amber-400' }
        : { dot: 'bg-red-500', label: 'Оффлайн', text: 'text-red-600 dark:text-red-400' }
  return (
    <span
      className="inline-flex items-center gap-1.5 select-none"
      title={cfg.label}
      aria-label={`Соединение: ${cfg.label}`}
    >
      <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
      {withLabel && (
        <span className={cn('text-[11px] font-semibold uppercase tracking-wide', cfg.text)}>{cfg.label}</span>
      )}
    </span>
  )
}
