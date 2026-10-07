'use client'

import { CheckCheck, Flame } from 'lucide-react'
import type { AggRow } from '@/lib/derive'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card'

/**
 * Строка блюда в сводке цеха: агрегированное количество, бейджи столов,
 * кнопки «Готовится» / «Готово» на весь батч.
 */
export function BatchRow({ row }: { row: AggRow }) {
  // «только что пришло»: любая позиция строки сейчас во флэше стора
  const flashing = usePosStore((s) => {
    const now = Date.now()
    return row.itemIds.some((id) => (s.flash[id] ?? 0) > now)
  })

  return (
    <article
      className={cn(
        'bg-card animate-fade-up rounded-xl border border-border border-l-4 p-3',
        row.anyCooking ? 'border-l-amber-500' : 'border-l-border',
        flashing && 'animate-flash',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'font-display w-11 shrink-0 text-center text-[26px] leading-none font-extrabold tabular-nums',
            row.anyCooking ? 'text-amber-400' : 'text-foreground',
          )}
        >
          {row.totalQty}
        </span>
        <h3 className="text-foreground min-w-0 flex-1 pt-0.5 text-[13.5px] leading-snug font-semibold line-clamp-2">
          {row.name}
        </h3>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {row.entries.map((entry) => (
          <span
            key={entry.tableNumber}
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap',
              entry.anyCooking
                ? 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
                : 'bg-secondary text-secondary-foreground',
            )}
          >
            Стол {entry.tableNumber} · {entry.qty} шт
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => usePosStore.getState().setItemStatus(row.itemIds, 'cooking')}
          className={cn(
            FOCUS,
            'active:scale-95 inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors',
            row.anyCooking
              ? 'bg-amber-500 text-stone-950'
              : 'border border-amber-500/40 text-amber-400 hover:bg-amber-500/15',
          )}
        >
          <Flame className="size-3.5" strokeWidth={2.2} />
          Готовится
        </button>
        <button
          type="button"
          onClick={() => usePosStore.getState().setItemStatus(row.itemIds, 'done')}
          className={cn(
            FOCUS,
            'border border-emerald-500/40 text-emerald-400 active:scale-95 hover:bg-emerald-500/15 inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors',
          )}
        >
          <CheckCheck className="size-3.5" strokeWidth={2.2} />
          Готово
        </button>
      </div>
    </article>
  )
}
