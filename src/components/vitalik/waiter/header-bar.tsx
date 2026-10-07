'use client'

import { useState } from 'react'
import { BellRing, MessageSquareText, PenLine, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { buildTableMap } from '@/lib/derive'
import { TABLES, TABLE_NOTE_PRESETS, WAITER_NAMES } from '@/lib/menu'
import { cn } from '@/lib/utils'

/* ============================================================
   Шапка экрана официанта: логотип, имя, выбор стола, ВИП,
   комментарий к столу.
   ============================================================ */

export function HeaderBar() {
  const connection = useAppStore((s) => s.connection)
  const waiterName = useAppStore((s) => s.waiterName)
  const setWaiterName = useAppStore((s) => s.setWaiterName)
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const orders = useAppStore((s) => s.orders)
  const drafts = useAppStore((s) => s.drafts)

  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [noteSheetOpen, setNoteSheetOpen] = useState(false)

  const tableMap = buildTableMap(orders)
  const selectedLabel = TABLES.find((t) => t.id === selectedTableId)?.label ?? ''
  const draft = drafts[selectedTableId]
  const tableNote = draft?.tableNote ?? ''

  const openNameDialog = () => {
    setNameInput(waiterName)
    setNameDialogOpen(true)
  }

  return (
    <header className="flex flex-col gap-3">
      {/* Логотип + связь */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <BellRing className="h-5 w-5 text-black" strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <div className="font-display text-[22px] font-extrabold tracking-tight text-zinc-50">
              ВИТАЛИК
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
              Официант
            </div>
          </div>
        </div>
        <ConnectionBadgeInline connection={connection} />
      </div>

      {/* Имя официанта */}
      <section aria-label="Имя официанта">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Официант
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {WAITER_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setWaiterName(name)}
              className={cn(
                'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-all active:scale-95',
                waiterName === name
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25'
                  : 'bg-[#1D232D] text-zinc-300',
              )}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={openNameDialog}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all active:scale-95',
              waiterName && !WAITER_NAMES.includes(waiterName)
                ? 'bg-emerald-500 text-black'
                : 'bg-[#1D232D] text-zinc-300',
            )}
          >
            {waiterName && !WAITER_NAMES.includes(waiterName) ? (
              <PenLine className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {waiterName && !WAITER_NAMES.includes(waiterName) ? waiterName : 'Своё имя'}
          </button>
        </div>
      </section>

      {/* Выбор стола */}
      <section aria-label="Выбор стола">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Стол · {selectedLabel}
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {TABLES.map((t) => {
            const st = tableMap.get(t.id)
            const selected = selectedTableId === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTable(t.id)}
                aria-label={t.label}
                className={cn(
                  'relative grid h-12 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold transition-all active:scale-95',
                  t.banquet ? 'w-[68px]' : 'w-12',
                  selected
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25'
                    : 'bg-[#1D232D] text-zinc-300',
                )}
              >
                {t.short}
                {st && (
                  <span
                    className={cn(
                      'absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0F1115]',
                      st.status === 'sent' && 'animate-pulse bg-yellow-400',
                      st.status === 'cooking' && 'bg-amber-500',
                      st.status === 'ready' && 'animate-pulse bg-emerald-400',
                    )}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ВИП + комментарий к столу */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={draft?.vip === true}
          onClick={() => useAppStore.getState().setDraftVip(selectedTableId, !draft?.vip)}
          className={cn(
            'flex h-[52px] flex-1 items-center gap-2.5 rounded-2xl border px-4 transition-all active:scale-[0.98]',
            draft?.vip
              ? 'vip-frame bg-gradient-to-r from-[#3A2412]/40 to-[#3F1220]/40'
              : 'border-white/10 bg-[#161B23]',
          )}
        >
          <span className="text-lg leading-none">⭐</span>
          <span className="flex flex-col items-start leading-none">
            <span
              className={cn(
                'text-[13px] font-extrabold uppercase tracking-wide',
                draft?.vip ? 'text-amber-300' : 'text-zinc-300',
              )}
            >
              ВИП / Заказчик
            </span>
            <span className={cn('mt-1 text-[10px] font-semibold', draft?.vip ? 'text-amber-400/80' : 'text-zinc-500')}>
              {draft?.vip ? 'Высший приоритет на кухне' : 'Обычный заказ'}
            </span>
          </span>
          <Switch
            checked={draft?.vip === true}
            onCheckedChange={(v) => useAppStore.getState().setDraftVip(selectedTableId, v)}
            className="ml-auto data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-400 data-[state=checked]:to-rose-500"
          />
        </button>
        <button
          type="button"
          onClick={() => setNoteSheetOpen(true)}
          className={cn(
            'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95',
            tableNote
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : 'border-white/10 bg-[#161B23] text-zinc-400',
          )}
          aria-label="Комментарий к столу"
        >
          <MessageSquareText className="h-5 w-5" />
        </button>
      </div>

      {/* Свой имя */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-w-[340px] rounded-3xl border-white/10 bg-[#161B23]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-extrabold">Имя официанта</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="waiter-name" className="text-xs text-zinc-400">
              Как вас зовут? (увидит кухня и раздача)
            </Label>
            <Input
              id="waiter-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.toUpperCase())}
              placeholder="НАПРИМЕР: СЕРГЕЙ"
              maxLength={40}
              className="h-12 rounded-2xl border-white/10 bg-[#0F1115] text-base font-bold uppercase tracking-wide"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setWaiterName('')
                setNameDialogOpen(false)
              }}
              className="h-12 flex-1 rounded-2xl text-zinc-400"
            >
              Сбросить
            </Button>
            <Button
              onClick={() => {
                const trimmed = nameInput.trim()
                if (trimmed) setWaiterName(trimmed.toUpperCase())
                setNameDialogOpen(false)
              }}
              className="h-12 flex-[2] rounded-2xl bg-emerald-500 text-base font-bold text-black hover:bg-emerald-400"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Комментарий к столу */}
      <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[520px] rounded-t-3xl border-white/10 bg-[#161B23] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-1 text-left">
            <SheetTitle className="font-display text-lg font-extrabold">
              Комментарий к столу · {selectedLabel}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500">
              Увидит шеф в тикете. Например: «Отдать строго после тоста», «Детям первым».
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <Textarea
              value={tableNote}
              onChange={(e) => useAppStore.getState().setDraftTableNote(selectedTableId, e.target.value)}
              placeholder="Напишите пожелание зала…"
              className="min-h-[90px] rounded-2xl border-white/10 bg-[#0F1115] text-[15px]"
              maxLength={140}
            />
            <div className="flex flex-wrap gap-2">
              {TABLE_NOTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const next = tableNote.trim()
                    const merged = next ? `${next}${next.endsWith('.') ? '' : ','} ${preset}` : preset
                    useAppStore.getState().setDraftTableNote(selectedTableId, merged)
                  }}
                  className="h-10 rounded-full bg-[#1D232D] px-3.5 text-[13px] font-semibold text-zinc-300 active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setNoteSheetOpen(false)}
              className="h-14 w-full rounded-2xl bg-emerald-500 text-base font-extrabold text-black hover:bg-emerald-400"
            >
              Готово
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}

function ConnectionBadgeInline({ connection }: { connection: 'connecting' | 'online' | 'offline' }) {
  if (connection === 'online')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Онлайн
      </span>
    )
  if (connection === 'offline')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        Офлайн · копим
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
      Связь…
    </span>
  )
}
