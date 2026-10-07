'use client'

import { categoriesForPeriod } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Ряд 5 шапки: чипсы категорий («Все» + категории текущего периода) */
export function CategoryChips() {
  const period = usePosStore((s) => s.period)
  const category = usePosStore((s) => s.category)
  const setCategory = usePosStore((s) => s.setCategory)

  const chips: { value: string | null; label: string }[] = [
    { value: null, label: 'Все' },
    ...categoriesForPeriod(period).map((c) => ({ value: c.name, label: c.chipLabel })),
  ]

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
      {chips.map(({ value, label }) => {
        const active = category === value
        return (
          <button
            key={value ?? 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => setCategory(value)}
            className={cn(
              'h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              active
                ? 'border-transparent bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
