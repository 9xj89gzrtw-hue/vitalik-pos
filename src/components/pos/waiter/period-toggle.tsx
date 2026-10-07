'use client'

import { PERIOD_HOURS, PERIOD_LABELS } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import type { Period } from '@/lib/types'
import { cn } from '@/lib/utils'

const SEGMENTS: { period: Period; label: string }[] = [
  { period: 'breakfast', label: PERIOD_LABELS.breakfast },
  { period: 'lunch', label: PERIOD_LABELS.lunch },
]

/** Ряд 3 шапки: сегментный переключатель «Завтрак / Обед» */
export function PeriodToggle() {
  const period = usePosStore((s) => s.period)
  const setPeriod = usePosStore((s) => s.setPeriod)

  return (
    <div className="mx-4 mt-1 grid grid-cols-2 rounded-xl bg-secondary p-1" aria-label="Период меню">
      {SEGMENTS.map(({ period: p, label }) => {
        const active = period === p
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              active
                ? 'bg-foreground font-bold text-background shadow-sm'
                : 'font-medium text-muted-foreground',
            )}
          >
            <span className="leading-none">{label}</span>
            <span className="text-[10px] leading-none opacity-70">{PERIOD_HOURS[p]}</span>
          </button>
        )
      })}
    </div>
  )
}
