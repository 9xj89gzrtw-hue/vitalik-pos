'use client'

import { Plus } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { GARNISH_ITEMS } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import type { MenuItem } from '@/lib/types'

interface GarnishDialogProps {
  /** блюдо, к которому выбираем гарнир (null — диалог закрыт) */
  item: MenuItem | null
  onDismiss: () => void
}

/**
 * Bottom-drawer выбора гарнира: «Без гарнира» или один из sd1…sd3.
 * Выбор = +1 позиция в чек немедленно (звук/вибрация — в store.addToCheck).
 */
export function GarnishDialog({ item, onDismiss }: GarnishDialogProps) {
  const table = usePosStore((s) => s.selectedTable)
  const addToCheck = usePosStore((s) => s.addToCheck)

  const pick = (garnishId?: string) => {
    if (!item) return
    addToCheck(table, item, garnishId)
    onDismiss()
  }

  return (
    <Drawer
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <DrawerContent className="mx-auto max-w-2xl rounded-t-3xl">
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="font-display text-lg font-bold">Добавить гарнир?</DrawerTitle>
          <DrawerDescription className="line-clamp-2 font-display text-sm font-bold text-foreground">
            {item?.name}
          </DrawerDescription>
        </DrawerHeader>

        <div className="safe-bottom flex flex-col gap-2 px-4 pb-5 pt-2">
          <button
            type="button"
            onClick={() => pick()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary font-semibold text-secondary-foreground transition active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Без гарнира
          </button>

          {GARNISH_ITEMS.map((garnish) => (
            <button
              key={garnish.id}
              type="button"
              onClick={() => pick(garnish.id)}
              className="flex h-12 w-full items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-left font-semibold text-foreground transition active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{garnish.name}</span>
              <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                {garnish.time}
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
