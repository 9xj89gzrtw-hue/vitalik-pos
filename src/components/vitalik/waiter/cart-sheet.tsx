'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Send, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { activeOrders, pluralDishes, pluralPositions } from '@/lib/derive'
import { findMenuItem, QUICK_NOTES, TABLES } from '@/lib/menu'
import type { DraftItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Корзина (Bottom Sheet): позиции, количество, быстрые
   комментарии, огромная кнопка «ОТПРАВИТЬ НА КУХНЮ».
   ============================================================ */

export function CartBar() {
  const [open, setOpen] = useState(false)
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const drafts = useAppStore((s) => s.drafts)
  const items = drafts[selectedTableId]?.items ?? []
  const pieces = items.reduce((acc, c) => acc + c.qty, 0)
  const vip = drafts[selectedTableId]?.vip === true

  const tableLabel = TABLES.find((t) => t.id === selectedTableId)?.label ?? ''
  const waiterName = useAppStore((s) => s.waiterName)

  if (pieces === 0) return null

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'pointer-events-auto mx-auto flex h-[58px] w-full max-w-[488px] items-center gap-3 rounded-2xl px-5 text-left shadow-2xl transition-all active:scale-[0.98]',
            vip
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-black'
              : 'bg-emerald-500 text-black shadow-emerald-500/30',
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/20 text-lg font-black">
            {pieces}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight">
              Корзина · {pluralDishes(pieces)}
            </span>
            <span className="block truncate text-[11px] font-semibold opacity-70">
              {tableLabel}
              {waiterName ? ` · ${waiterName}` : ''}
              {vip ? ' · ⚡ ВИП' : ''}
            </span>
          </span>
          <ChevronUp className="h-5 w-5 shrink-0 opacity-70" />
        </button>
      </div>

      <CartSheet open={open} onOpenChange={setOpen} />
    </>
  )
}

function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const drafts = useAppStore((s) => s.drafts)
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)
  const sending = useAppStore((s) => s.sending)
  const submitDraft = useAppStore((s) => s.submitDraft)
  const updateDraftQty = useAppStore((s) => s.updateDraftQty)
  const removeDraftItem = useAppStore((s) => s.removeDraftItem)
  const setDraftComment = useAppStore((s) => s.setDraftComment)
  const toggleDraftQuickNote = useAppStore((s) => s.toggleDraftQuickNote)

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')

  const draft = drafts[selectedTableId]
  const items = draft?.items ?? []
  const pieces = items.reduce((acc, c) => acc + c.qty, 0)
  const vip = draft?.vip === true
  const tableNote = draft?.tableNote ?? ''
  const tableLabel = TABLES.find((t) => t.id === selectedTableId)?.label ?? ''
  const isAddendum = activeOrders(orders).some((o) => o.tableId === selectedTableId)

  const startEdit = (item: DraftItem) => {
    setEditingKey(item.key)
    setCustomInput('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92dvh] max-w-[520px] flex-col rounded-t-3xl border-white/10 bg-[#161B23] pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 px-5 pb-2 text-left">
          <div>
            <SheetTitle className="font-display text-xl font-extrabold leading-tight">
              Чек · {tableLabel}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-zinc-500">
              {pluralDishes(pieces)} · {pluralPositions(items.length)}
              {waiterName ? ` · ${waiterName}` : ' · выберите имя!'}
              {isAddendum ? ' · дозаказ' : ''}
            </SheetDescription>
          </div>
          {vip && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black">
              ⚡ ВИП
            </span>
          )}
        </SheetHeader>

        <div className="max-h-[52dvh] flex-1 overflow-y-auto px-5 nice-scroll">
          {tableNote && (
            <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] font-semibold leading-relaxed text-amber-300">
              💬 Комментарий к столу: {tableNote}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-white/[0.07] bg-[#0F1115] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 items-center gap-1 rounded-xl bg-[#1D232D] px-1">
                    <button
                      type="button"
                      aria-label="Меньше"
                      onClick={() => updateDraftQty(selectedTableId, item.key, -1)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 active:bg-white/10"
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className="w-7 text-center text-lg font-black tabular-nums text-zinc-100">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Больше"
                      onClick={() => updateDraftQty(selectedTableId, item.key, 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-emerald-400 active:bg-emerald-500/15"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold leading-snug text-zinc-100">
                      {qtyLabel(item.qty)} {item.name}
                    </div>
                    {item.garnishId && (
                      <div className="mt-0.5 text-xs font-semibold text-emerald-400/90">
                        ↳ Гарнир: {garnishName(item.garnishId)}
                      </div>
                    )}
                    {item.standalone && (
                      <div className="mt-0.5 text-xs font-semibold text-sky-300/80">
                        ↳ отдельное блюдо
                      </div>
                    )}
                    {item.comment && (
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="mt-1 inline-flex max-w-full items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
                      >
                        <span className="truncate">❗ {item.comment}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!item.comment && (
                      <button
                        type="button"
                        aria-label="Комментарий к блюду"
                        onClick={() => startEdit(item)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-[#1D232D] text-zinc-400 active:scale-95"
                      >
                        💬
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Удалить"
                      onClick={() => removeDraftItem(selectedTableId, item.key)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-[#1D232D] text-red-400/80 active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingKey === item.key && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#161B23] p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                      Комментарий к блюду
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {QUICK_NOTES.map((note) => {
                        const active = (item.comment ?? '').includes(note)
                        return (
                          <button
                            key={note}
                            type="button"
                            onClick={() => toggleDraftQuickNote(selectedTableId, item.key, note)}
                            className={cn(
                              'h-9 rounded-full px-3 text-[12px] font-bold transition-all active:scale-95',
                              active
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#1D232D] text-zinc-300',
                            )}
                          >
                            {note}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Свой текст…"
                        maxLength={80}
                        className="h-11 flex-1 rounded-xl border-white/10 bg-[#0F1115]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customInput.trim()) {
                            const parts = [item.comment, customInput.trim()].filter(Boolean).join(', ')
                            setDraftComment(selectedTableId, item.key, parts)
                            setCustomInput('')
                          }
                          setEditingKey(null)
                        }}
                        className="h-11 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black active:scale-95"
                      >
                        ОК
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-3">
          <button
            type="button"
            disabled={pieces === 0 || sending || !waiterName.trim()}
            onClick={() => {
              void submitDraft(selectedTableId).then((ok) => {
                if (ok) onOpenChange(false)
              })
            }}
            className={cn(
              'flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-[17px] font-black transition-all active:scale-[0.98]',
              pieces === 0 || !waiterName.trim()
                ? 'cursor-not-allowed bg-[#242B36] text-zinc-600'
                : vip
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-black shadow-2xl shadow-orange-500/25'
                  : 'bg-emerald-500 text-black shadow-2xl shadow-emerald-500/25',
            )}
          >
            {sending ? (
              <>
                <ChevronDown className="h-5 w-5 animate-bounce" />
                Отправляем…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" strokeWidth={2.5} />
                ОТПРАВИТЬ НА КУХНЮ ({pieces})
              </>
            )}
          </button>
          {!waiterName.trim() && (
            <p className="mt-2 text-center text-[11px] font-semibold text-amber-400/80">
              Сначала выберите имя официанта вверху экрана
            </p>
          )}
          {isAddendum && pieces > 0 && (
            <p className="mt-2 text-center text-[11px] font-semibold text-amber-400/80">
              Это дозаказ — блюда уедут с меткой «ДОЗАКАЗ» в тот же тикет
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function qtyLabel(qty: number): string {
  return `${qty}×`
}

function garnishName(garnishId: string): string {
  return findMenuItem(garnishId)?.name ?? ''
}
