'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Loader2, ReceiptText, Send } from 'lucide-react'
import { checkTotals, plural } from '@/lib/derive'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CheckLine } from './check-line'

/**
 * Bottom sheet чека: свёрнутый бар всегда виден,
 * раскрытие — шапка + список позиций + отправка на кухню.
 */
export function CheckSheet() {
  const [open, setOpen] = useState(false)

  const selectedTable = usePosStore((s) => s.selectedTable)
  const checks = usePosStore((s) => s.checks)
  const orders = usePosStore((s) => s.orders)
  const sending = usePosStore((s) => s.sending)
  const sendCheck = usePosStore((s) => s.sendCheck)
  const clearCheck = usePosStore((s) => s.clearCheck)

  const check = checks[selectedTable] ?? []
  const { lines, pieces } = checkTotals(check)
  const empty = lines === 0
  /* у стола уже есть активные заказы → отправка будет дозаказом */
  const isAddition = orders.some((o) => o.tableNumber === selectedTable)

  /* Esc закрывает раскрытый чек */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = () => setOpen((v) => !v)

  const handleSend = async () => {
    if (empty || sending) return
    const ok = await sendCheck(selectedTable)
    /* звук/вибрацию/очистку/плашку делает сам стор */
    if (ok) setOpen(false)
  }

  const handleClear = () => {
    if (window.confirm(`Очистить чек стола ${selectedTable}?`)) clearCheck(selectedTable)
  }

  return (
    <>
      {/* затемнение под раскрытым чеком */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="safe-bottom mx-auto max-w-2xl rounded-t-3xl border-x border-t border-border bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          {/* ручка: вся область над контентом кликабельна для раскрытия */}
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? 'Свернуть чек' : 'Раскрыть чек'}
            className="flex w-full cursor-pointer flex-col items-center py-2 outline-none focus-visible:rounded-t-3xl focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden="true" />
          </button>

          {/* свёрнутый бар */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="-mx-1 min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span className="flex items-center gap-1.5">
                <span className="block truncate font-display text-base font-extrabold leading-tight">
                  Стол {selectedTable}
                </span>
                {isAddition ? (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    дозаказ
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'block truncate text-xs leading-tight',
                  empty ? 'text-muted-foreground' : 'font-semibold text-foreground/80',
                )}
              >
                {empty
                  ? 'Чек пуст — добавьте блюда'
                  : `${lines} ${plural(lines, 'позиция', 'позиции', 'позиций')} · ${pieces} шт`}
              </span>
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={open ? 'Свернуть чек' : 'Раскрыть чек'}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <ChevronUp
                className={cn('size-5 transition-transform duration-300', open && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {/* отправка на кухню */}
            <button
              type="button"
              onClick={handleSend}
              disabled={empty || sending}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[12.5px] font-extrabold uppercase tracking-wide text-primary-foreground transition active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isAddition ? 'Дозаказ на кухню' : 'Отправить на кухню'}
              </span>
              <span className="sm:hidden">{isAddition ? 'Дозаказ' : 'На кухню'}</span>
            </button>
          </div>

          {/* раскрытое тело */}
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key="check-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 pb-2 pt-3">
                  <h2 className="font-display text-base font-bold">Чек · Стол {selectedTable}</h2>
                  <div className="flex items-center gap-1">
                    {!empty ? (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition hover:text-red-600 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        Очистить
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Свернуть чек"
                      className="grid size-9 place-items-center rounded-xl bg-secondary transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <ChevronDown className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {empty ? (
                  <div className="flex flex-col items-center gap-2 px-4 pb-6 pt-3 text-center">
                    <div className="grid size-11 place-items-center rounded-full bg-secondary">
                      <ReceiptText className="size-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">Чек пуст</p>
                    <p className="text-xs leading-snug text-muted-foreground/80">
                      Добавьте блюда из меню — они появятся здесь
                    </p>
                  </div>
                ) : (
                  <div className="scrollbar-slim max-h-[46dvh] space-y-2 overflow-y-auto px-4 pb-2">
                    {check.map((line, index) => (
                      <CheckLine key={line.key} table={selectedTable} line={line} index={index} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
