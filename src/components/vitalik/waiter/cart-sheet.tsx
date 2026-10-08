'use client'

import { useState } from 'react'
import { ChevronUp, Loader2, Minus, Plus, Trash2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { activeOrders, pluralDishes, pluralPositions } from '@/lib/derive'
import { findMenuItem, QUICK_NOTES, tableLabelOf } from '@/lib/menu'
import type { DraftItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Корзина (vaul Drawer, фиксирована снизу): свёрнутый бар
   «Стол N · X поз. · Y шт» + развёрнутый чек со степперами,
   быстрыми комментариями и гигантской кнопкой отправки.
   ============================================================ */

export function CartSheet() {
  const [open, setOpen] = useState(false)

  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const items = useAppStore((s) => s.drafts[selectedTableId]?.items)
  const vip = useAppStore((s) => s.drafts[selectedTableId]?.vip === true)
  const tableNote = useAppStore((s) => s.drafts[selectedTableId]?.tableNote ?? '')
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)
  const sending = useAppStore((s) => s.sending)
  const submitDraft = useAppStore((s) => s.submitDraft)
  const clearDraft = useAppStore((s) => s.clearDraft)

  const list = items ?? []
  const positions = list.length
  const pieces = list.reduce((acc, c) => acc + c.qty, 0)
  const tableLabel = tableLabelOf(selectedTableId)
  const isAddendum = activeOrders(orders ?? []).some((o) => o.tableId === selectedTableId)

  const handleSubmit = async () => {
    if (pieces === 0 || sending) return
    // стор сам проверит стоп-лист/остатки, сыграет звук, покажет тост
    // и переключит вкладку на «Статус стола»
    const ok = await submitDraft(selectedTableId)
    if (ok) setOpen(false)
  }

  return (
    <>
      {/* Свёрнутый бар — всегда виден на вкладке «Меню» */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-40 px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Корзина: ${tableLabel}, ${pluralPositions(positions)}, ${pieces} шт. Развернуть чек`}
          className={cn(
            'pointer-events-auto mx-auto flex h-[58px] w-full max-w-[488px] items-center gap-3 rounded-2xl border px-4 text-left shadow-2xl shadow-black/50 transition-all active:scale-[0.98]',
            vip
              ? 'vip-frame'
              : 'border-[#262B35] bg-[#161922]/95 backdrop-blur-xl',
          )}
        >
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base font-black',
              pieces > 0 ? 'bg-[#10B981] text-[#05140E]' : 'bg-[#232936] text-zinc-400',
            )}
            aria-hidden
          >
            {pieces}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold leading-tight text-[#F5F1E8]">
              {tableLabel} · {positions} поз. · {pieces} шт
            </span>
            <span className="block truncate text-[11px] font-semibold leading-tight text-zinc-500">
              {vip ? '⭐ ВИП / Заказчик · ' : ''}Нажмите, чтобы открыть чек
            </span>
          </span>
          <ChevronUp className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
        </button>
      </div>

      {/* Развёрнутый чек */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className={cn(
            'mx-auto flex max-h-[88dvh] max-w-[520px] flex-col rounded-t-3xl bg-[#161922] pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
            vip && 'vip-frame',
          )}
        >
          <DrawerHeader className="flex-row items-center justify-between space-y-0 px-5 pb-2 text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-xl font-extrabold leading-tight text-[#F5F1E8]">
                Чек · {tableLabel}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs text-zinc-500">
                {pluralPositions(positions)} · {pluralDishes(pieces)}
                {isAddendum ? ' · дозаказ к активному заказу' : ''}
              </DrawerDescription>
            </div>
            {vip && <span className="vip-chip shrink-0">⭐ ВИП / Заказчик</span>}
          </DrawerHeader>

          <div className="nice-scroll max-h-[46dvh] flex-1 overflow-y-auto px-5">
            {tableNote && (
              <div className="mb-3 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#F59E0B]">
                💬 {tableNote}
              </div>
            )}

            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#262B35] px-4 py-8 text-center">
                <div className="text-2xl" aria-hidden>
                  🧾
                </div>
                <div className="mt-2 text-[13px] font-bold text-zinc-300">Чек пуст</div>
                <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Выберите блюда в меню — они появятся здесь
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((item) => (
                  <CheckLine key={item.key} item={item} tableId={selectedTableId} />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-3">
            <button
              type="button"
              disabled={pieces === 0 || sending}
              aria-label={`Отправить на кухню, ${pluralDishes(pieces)}`}
              onClick={() => void handleSubmit()}
              className={cn(
                'flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl text-[17px] font-black tracking-wide transition-all active:scale-[0.98]',
                pieces === 0 || sending
                  ? 'cursor-not-allowed bg-[#232936] text-zinc-600'
                  : 'bg-[#10B981] text-[#05140E] shadow-2xl shadow-[#10B981]/25',
              )}
            >
              {sending ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  Отправляем…
                </>
              ) : (
                <>ОТПРАВИТЬ НА КУХНЮ ({pluralDishes(pieces)})</>
              )}
            </button>

            <div className="flex min-h-[44px] flex-wrap items-center justify-center gap-4 pt-1">
              {pieces > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Очистить чек? Все позиции будут удалены.')) {
                      clearDraft(selectedTableId)
                    }
                  }}
                  className="flex h-11 items-center rounded-xl px-4 text-[12px] font-bold text-[#EF4444]/90 transition-all active:scale-[0.98]"
                  aria-label="Очистить чек"
                >
                  Очистить чек
                </button>
              )}
              {!waiterName.trim() && pieces > 0 && (
                <span className="text-[11px] font-semibold text-[#F59E0B]/80">
                  Выберите имя официанта вверху экрана
                </span>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

/* ---------- строка чека: степперы, гарнир, комментарий ---------- */

function CheckLine({ item, tableId }: { item: DraftItem; tableId: string }) {
  const updateDraftQty = useAppStore((s) => s.updateDraftQty)
  const removeDraftItem = useAppStore((s) => s.removeDraftItem)
  const setDraftComment = useAppStore((s) => s.setDraftComment)
  const toggleDraftQuickNote = useAppStore((s) => s.toggleDraftQuickNote)

  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')

  const parts = (item.comment ?? '')
    .split(', ')
    .map((s) => s.trim())
    .filter(Boolean)

  const openEditor = () => {
    if (!expanded) setInput(item.comment ?? '')
    setExpanded(true)
  }

  const commit = () => {
    setDraftComment(tableId, item.key, input)
  }

  const onChip = (note: string) => {
    const next = [...parts]
    const idx = next.indexOf(note)
    if (idx >= 0) next.splice(idx, 1)
    else next.push(note)
    // держим поле ввода в синхроне с тоглами быстрых заметок
    setInput(next.join(', '))
    toggleDraftQuickNote(tableId, item.key, note)
  }

  return (
    <div className="rounded-2xl border border-[#262B35] bg-[#0D0F12] p-3">
      <div className="flex items-center gap-3">
        {/* степперы −/+ */}
        <div className="flex h-[40px] shrink-0 items-center gap-0.5 rounded-xl bg-[#232936] px-0.5">
          <button
            type="button"
            aria-label={`Убрать одну: ${item.name}`}
            onClick={() => updateDraftQty(tableId, item.key, -1)}
            className="grid h-10 w-10 place-items-center rounded-lg text-zinc-400 transition-all active:scale-95 active:bg-white/10"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <span className="w-7 text-center text-lg font-black tabular-nums text-[#F5F1E8]">
            {item.qty}
          </span>
          <button
            type="button"
            aria-label={`Добавить одну: ${item.name}`}
            onClick={() => updateDraftQty(tableId, item.key, 1)}
            className="grid h-10 w-10 place-items-center rounded-lg text-[#10B981] transition-all active:scale-95 active:bg-[#10B981]/15"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* название + подстроки: тап → редактор комментария */}
        <button
          type="button"
          onClick={openEditor}
          aria-label={`Комментарий к блюду «${item.name}»`}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left transition-all active:scale-[0.99]"
        >
          <div className="text-[14px] font-bold leading-snug text-[#F5F1E8]">
            {item.qty}× {item.name}
          </div>
          {item.garnishId && (
            <div className="mt-0.5 text-xs font-semibold text-[#10B981]">
              + {findMenuItem(item.garnishId)?.name ?? 'гарнир'}
            </div>
          )}
          {item.standalone && (
            <div className="mt-0.5 text-xs font-semibold text-zinc-500">гарнир отдельно</div>
          )}
          {item.comment && (
            <div className="mt-1 text-[11px] font-bold text-[#F59E0B]">«{item.comment}»</div>
          )}
        </button>

        {/* удаление */}
        <button
          type="button"
          aria-label={`Удалить «${item.name}» из чека`}
          onClick={() => removeDraftItem(tableId, item.key)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#232936] text-[#EF4444] transition-all active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* редактор комментария к строке */}
      {expanded && (
        <div className="mt-3 rounded-xl border border-[#262B35] bg-[#161922] p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            Комментарий к блюду
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_NOTES.map((note) => {
              const active = parts.includes(note)
              return (
                <button
                  key={note}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChip(note)}
                  className={cn(
                    'h-9 rounded-full px-3 text-[12px] font-bold transition-all active:scale-95',
                    active ? 'bg-[#F59E0B] text-[#14100A]' : 'bg-[#232936] text-zinc-300',
                  )}
                >
                  {note}
                </button>
              )
            })}
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit()
                e.currentTarget.blur()
              }
            }}
            onBlur={commit}
            placeholder="Свой текст… (Enter — сохранить)"
            maxLength={80}
            className="h-11 rounded-xl border-[#262B35] bg-[#0D0F12] text-[14px] text-[#F5F1E8]"
            aria-label="Свой комментарий к блюду"
          />
        </div>
      )}
    </div>
  )
}
