'use client'

import { Minus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'
import { GARNISH_ITEMS } from '@/lib/menu'
import type { MenuItem } from '@/lib/types'

/* ============================================================
   «Выбрать гарнир к [Блюдо]?»
   [ Без гарнира ] | [ + Картофель беби ] | [ + Овощное соте ] | [ + Жасминовый рис ]
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

  if (!item) return null

  const add = (garnishId?: string) => {
    addToDraft(selectedTableId, item, garnishId ? { garnishId } : undefined)
    onClose()
  }

  return (
    <Sheet
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-w-[520px] rounded-t-3xl border-white/10 bg-[#161B23] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
      >
        <SheetHeader className="pb-1 text-left">
          <SheetTitle className="font-display text-lg font-extrabold leading-snug">
            Выбрать гарнир к «{shortName(item.name)}»?
          </SheetTitle>
          <SheetDescription className="text-xs text-zinc-500">
            Гарнир уедет на кухню привязанным к блюду — повар увидит их вместе.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => add()}
            className="flex h-[58px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0F1115] px-4 text-left transition-all active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#242B36] text-zinc-500">
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-[15px] font-bold text-zinc-300">Без гарнира</span>
          </button>

          {GARNISH_ITEMS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => add(g.id)}
              className="flex h-[58px] w-full items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-left transition-all active:scale-[0.98]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-xl font-black text-black">
                +
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-zinc-100">{g.name}</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-zinc-500">
                  ⏱ {g.time}
                  {g.description ? ` · ${g.description}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">
          Гарнир нужен отдельным блюдом? Вернитесь в категорию «Гарниры» и нажмите на него —
          он попадёт в чек как «отдельно».
        </p>
      </SheetContent>
    </Sheet>
  )
}

function shortName(name: string): string {
  return name.length > 34 ? `${name.slice(0, 33)}…` : name
}
