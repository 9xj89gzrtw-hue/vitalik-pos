'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { haptic } from '@/lib/audio'
import { GARNISH_ITEMS, QUICK_NOTES, findMenuItem } from '@/lib/menu'
import type { MenuItem, StopList } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { CartItem } from './waiter-screen'

/* ============================================================
   Окно добавления блюда: количество, выбор гарнира (для горячих
   закусок и горячих блюд), быстрые комментарии + свободный ввод.
   ============================================================ */

const NO_GARNISH = '__none__'

interface DishSheetProps {
  dish: MenuItem | null
  stoplist: StopList
  cart: CartItem[]
  onClose: () => void
  onAdd: (item: CartItem) => void
}

export function DishSheet({ dish, stoplist, cart, onClose, onAdd }: DishSheetProps) {
  // родитель ремаунтит компонент через key при смене блюда —
  // состояние сбрасывается без effect-каскада
  const [qty, setQty] = useState(1)
  const [garnish, setGarnish] = useState<string>(NO_GARNISH)
  const [quick, setQuick] = useState<string[]>([])
  const [free, setFree] = useState('')

  if (!dish) return null

  const inCartQty = (id: string) =>
    cart.filter((c) => c.menuItemId === id).reduce((a, c) => a + c.qty, 0)

  const stopDish = stoplist[dish.id]
  const remainingDish = stopDish?.remaining ?? null
  const maxQtyDish =
    remainingDish != null ? Math.max(0, remainingDish - inCartQty(dish.id)) : 30

  const garnishDish = garnish !== NO_GARNISH ? findMenuItem(garnish) : undefined
  const remainingGarnish = garnishDish ? stoplist[garnishDish.id]?.remaining ?? null : null
  const maxQtyGarnish =
    garnishDish && remainingGarnish != null
      ? Math.max(0, remainingGarnish - inCartQty(garnishDish.id))
      : 30

  const maxQty = Math.max(1, Math.min(maxQtyDish, maxQtyGarnish))
  const limitHit = qty >= maxQty

  const toggleQuick = (note: string) => {
    haptic(8)
    setQuick((prev) => (prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]))
  }

  const comment = [...quick, free.trim()].filter(Boolean).join(', ') || undefined

  const add = () => {
    if (qty < 1) return
    haptic(15)
    onAdd({
      menuItemId: dish.id,
      qty,
      comment,
      garnishId: dish.garnishAttachable && garnish !== NO_GARNISH ? garnish : null,
    })
  }

  return (
    <Dialog open={!!dish} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[92dvh] max-w-[520px] overflow-y-auto rounded-3xl border-[#262B35] bg-[#161922] text-[#F5F1E8] nice-scroll">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-[18px] font-black leading-snug">
            {dish.name}
          </DialogTitle>
          {dish.description && (
            <p className="text-left text-[12px] leading-snug text-zinc-500">{dish.description}</p>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Гарнир */}
          {dish.garnishAttachable && (
            <section aria-label="Выбор гарнира">
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
                Гарнир
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <GarnishOption
                  label="Без гарнира"
                  selected={garnish === NO_GARNISH}
                  onClick={() => {
                    haptic(8)
                    setGarnish(NO_GARNISH)
                  }}
                />
                {GARNISH_ITEMS.map((g) => (
                  <GarnishOption
                    key={g.id}
                    label={`+ ${g.short}`}
                    disabled={(stoplist[g.id]?.remaining ?? null) === 0 || stoplist[g.id]?.stopped}
                    selected={garnish === g.id}
                    onClick={() => {
                      haptic(8)
                      setGarnish(g.id)
                      setQty(1)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Количество */}
          <section aria-label="Количество порций" className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                haptic(8)
                setQty((q) => Math.max(1, q - 1))
              }}
              disabled={qty <= 1}
              aria-label="Меньше"
              className="grid h-[52px] w-[64px] place-items-center rounded-2xl border border-[#262B35] bg-[#0D0F12] text-2xl font-black text-zinc-300 disabled:opacity-40 active:scale-95"
            >
              <Minus className="h-5 w-5" strokeWidth={3} />
            </button>
            <div className="grid h-[52px] flex-1 place-items-center rounded-2xl border border-[#262B35] bg-[#0D0F12]">
              <span className="text-[22px] font-black tabular-nums text-[#F5F1E8]">{qty}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">порций</span>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic(8)
                setQty((q) => Math.min(maxQty, q + 1))
              }}
              disabled={limitHit}
              aria-label="Больше"
              className="grid h-[52px] w-[64px] place-items-center rounded-2xl border border-[#262B35] bg-[#0D0F12] text-2xl font-black text-zinc-300 disabled:opacity-40 active:scale-95"
            >
              <Plus className="h-5 w-5" strokeWidth={3} />
            </button>
          </section>
          {(remainingDish != null || (garnishDish && remainingGarnish != null)) && (
            <p className="-mt-2 text-center text-[11.5px] font-bold text-amber-300/90">
              ⚠️ Лимит: {maxQty} доступно к заказу
            </p>
          )}

          {/* Комментарии к блюду */}
          <section aria-label="Комментарий к блюду">
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
              Комментарий
            </h3>
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_NOTES.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => toggleQuick(note)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[13px] font-bold active:scale-[0.97]',
                    quick.includes(note)
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-[#262B35] bg-[#0D0F12] text-zinc-400',
                  )}
                >
                  {note}
                </button>
              ))}
            </div>
            <Input
              value={free}
              onChange={(e) => setFree(e.target.value)}
              placeholder="Свободный ввод: аллергии, пожелания…"
              className="h-[52px] border-[#262B35] bg-[#0D0F12] text-[15px] text-[#F5F1E8] placeholder:text-zinc-600"
            />
          </section>

          {/* Добавить */}
          <button
            type="button"
            onClick={add}
            className="h-[56px] rounded-2xl bg-[#D4AF37] text-[16px] font-black text-[#14100A] shadow-lg shadow-[#D4AF37]/25 active:scale-[0.98]"
          >
            ДОБАВИТЬ В ЗАКАЗ — {qty} порц.
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GarnishOption({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'h-[52px] rounded-2xl border text-[13.5px] font-extrabold transition-all active:scale-[0.98]',
        selected
          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5E29A]'
          : 'border-[#262B35] bg-[#0D0F12] text-zinc-400',
        disabled && 'opacity-40 grayscale',
      )}
    >
      {label}
    </button>
  )
}
