'use client'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useAppStore } from '@/lib/store'
import { stopInfo } from '@/lib/derive'
import { GARNISH_ITEMS } from '@/lib/menu'
import type { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   «Гарнир к блюду?» (vaul Drawer): вертикальные кнопки ≥52px —
   [Без гарнира] + 3 гарнира; гарнир в стопе — заблокирован.
   ============================================================ */

export function GarnishSheet({
  item,
  onClose,
}: {
  item: MenuItem | null
  onClose: () => void
}) {
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const addToDraft = useAppStore((s) => s.addToDraft)
  const stopList = useAppStore((s) => s.stopList)

  if (!item) return null

  const add = (garnishId?: string) => {
    addToDraft(selectedTableId, item, garnishId ? { garnishId } : undefined)
    onClose()
  }

  return (
    <Drawer
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DrawerContent className="mx-auto max-w-[520px] rounded-t-3xl bg-[#161922] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="text-lg font-extrabold leading-snug text-[#F5F1E8]">
            Гарнир к блюду?
          </DrawerTitle>
          <DrawerDescription className="font-bold text-[#F5F1E8]">
            {item.name}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-2" role="group" aria-label="Варианты гарнира">
          <button
            type="button"
            onClick={() => add()}
            aria-label="Без гарнира"
            className="flex h-[56px] w-full items-center gap-3 rounded-2xl border border-[#262B35] bg-[#232936] px-4 text-left transition-all active:scale-[0.98]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#161922] text-lg font-black text-zinc-400"
              aria-hidden
            >
              —
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-[#F5F1E8]">Без гарнира</span>
              <span className="text-[11px] font-semibold text-zinc-500">только основное блюдо</span>
            </span>
          </button>

          {GARNISH_ITEMS.map((g) => {
            const control = stopInfo(stopList, g.id)
            const blocked = control.stopped || control.remaining === 0
            return (
              <button
                key={g.id}
                type="button"
                disabled={blocked}
                aria-disabled={blocked}
                aria-label={`${g.name}${blocked ? ' — в стопе' : ''}`}
                onClick={() => add(g.id)}
                className={cn(
                  'flex h-[56px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all',
                  blocked
                    ? 'cursor-not-allowed border-[#262B35] bg-[#161922] opacity-50'
                    : 'border-[#10B981]/40 bg-[#10B981]/15 active:scale-[0.98]',
                )}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#10B981] text-xl font-black text-[#05140E]"
                  aria-hidden
                >
                  +
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-[#F5F1E8]">{g.name}</span>
                  <span className="text-[11px] font-semibold text-zinc-500">⏱ {g.time}</span>
                </span>
                {blocked ? (
                  <span className="shrink-0 rounded-md bg-[#EF4444]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#EF4444]">
                    в стопе
                  </span>
                ) : control.remaining != null ? (
                  <span className="shrink-0 whitespace-nowrap rounded-md border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                    осталось {control.remaining}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <p className="mt-3 pb-1 text-center text-[11px] leading-relaxed text-zinc-600">
          Гарнир нужен отдельным блюдом? Нажмите на него в категории «Гарниры».
        </p>
      </DrawerContent>
    </Drawer>
  )
}
