'use client'

import { Clock } from 'lucide-react'
import { isGarnishAttachable } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import type { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MenuCardProps {
  item: MenuItem
  /** индекс в отфильтрованном списке — для лёгкой stagger-задержки появления */
  index: number
  /** открыть диалог выбора гарнира (для блюд с привязываемым гарниром) */
  onPick: (item: MenuItem) => void
}

/** Карточка блюда: тап = +1 в чек (гибридные блюда → диалог гарнира) */
export function MenuCard({ item, index, onPick }: MenuCardProps) {
  const table = usePosStore((s) => s.selectedTable)
  const addToCheck = usePosStore((s) => s.addToCheck)
  const attachable = isGarnishAttachable(item)
  /* атомарный селектор: суммарное qty по всем строкам блюда (с любыми гарнирами) */
  const qty = usePosStore(
    (s) =>
      (s.checks[s.selectedTable] ?? [])
        .filter((c) => c.menuItemId === item.id)
        .reduce((acc, c) => acc + c.qty, 0),
  )

  const handleClick = () => {
    if (attachable) onPick(item)
    else addToCheck(table, item)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        attachable
          ? qty > 0
            ? `${item.name}, в чеке ${qty} шт., выбрать гарнир`
            : `${item.name}, готовится ${item.time}, выбор гарнира`
          : qty > 0
            ? `${item.name}, в чеке ${qty} шт.`
            : `${item.name}, готовится ${item.time}`
      }
      style={{ animationDelay: `${Math.min(index * 30, 360)}ms` }}
      className={cn(
        'animate-fade-up relative flex min-h-[132px] flex-col gap-1 rounded-2xl border bg-card p-3.5 text-left',
        'transition duration-200 active:scale-[0.96] outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        qty > 0 ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <span className="line-clamp-3 text-[13.5px] font-semibold leading-snug">{item.name}</span>
      {item.description ? (
        <span className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
          {item.description}
        </span>
      ) : null}
      <span className="flex-1" aria-hidden="true" />
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          {item.time}
        </span>
        {attachable ? (
          <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
            + гарнир
          </span>
        ) : null}
      </span>
      {qty > 0 ? (
        <span
          key={qty}
          className="animate-pop absolute -top-2 -right-1.5 grid size-7 place-items-center rounded-full border-2 border-background bg-primary text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/30"
        >
          {qty}
        </span>
      ) : null}
    </button>
  )
}
