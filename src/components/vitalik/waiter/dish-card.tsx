'use client'

import { Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { stopInfo } from '@/lib/derive'
import { isGarnishAttachable } from '@/lib/menu'
import type { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Карточка блюда (вся кликабельна, ≥88px):
   стоп-лист блокирует тап, остатки — янтарный бейдж,
   количество в чеке — изумрудный бейдж (атомарный селектор).
   ============================================================ */

export function DishCard({
  item,
  tableId,
  onPick,
}: {
  item: MenuItem
  tableId: string
  onPick: (item: MenuItem) => void
}) {
  const stopList = useAppStore((s) => s.stopList)
  // атомарный селектор: число — перерисовка только при изменении количества
  const qty = useAppStore((s) => {
    const items = s.drafts[tableId]?.items
    if (!items || items.length === 0) return 0
    return items.reduce((acc, c) => (c.menuItemId === item.id ? acc + c.qty : acc), 0)
  })

  const control = stopInfo(stopList, item.id)
  const inStop = control.stopped || control.remaining === 0
  const lowStock = !inStop && control.remaining != null && control.remaining > 0
  const attachable = isGarnishAttachable(item)

  return (
    <button
      type="button"
      disabled={inStop}
      aria-disabled={inStop}
      aria-label={`${item.name}, ${item.time}${inStop ? ', в стоп-листе' : ''}${lowStock ? `, осталось ${control.remaining}` : ''}`}
      onClick={() => onPick(item)}
      className={cn(
        'relative flex min-h-[88px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all',
        inStop
          ? 'cursor-not-allowed border-[#EF4444]/50 bg-[#161922] opacity-60 grayscale'
          : 'border-[#262B35] bg-[#161922] active:scale-[0.98]',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-[#F5F1E8]">{item.name}</span>
        {item.description && (
          <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {item.description}
          </span>
        )}
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-[#232936] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
            ⏱ {item.time}
          </span>
          {attachable && (
            <span className="rounded-md border border-[#10B981]/40 bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#10B981]">
              + гарнир
            </span>
          )}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {lowStock && (
          <span className="whitespace-nowrap rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">
            ⚠️ Осталось: {control.remaining} шт.
          </span>
        )}
        {qty > 0 ? (
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10B981] text-lg font-black text-[#05140E] shadow-lg shadow-[#10B981]/25">
            {qty}
          </span>
        ) : (
          !inStop && (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#232936] text-zinc-400">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </span>
          )
        )}
      </span>

      {inStop && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
          <span className="rounded-lg bg-[#EF4444] px-4 py-2 text-[13px] font-black uppercase tracking-widest text-white shadow-xl shadow-black/50">
            🚫 В СТОП-ЛИСТЕ
          </span>
        </span>
      )}
    </button>
  )
}
