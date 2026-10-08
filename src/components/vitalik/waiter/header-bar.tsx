'use client'

import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { buildTableMap, type TableStatus } from '@/lib/derive'
import { TABLES, WAITER_NAMES } from '@/lib/menu'
import { cn } from '@/lib/utils'
import { ConnectionBadge } from '../connection-badge'
import { useNow } from '../use-now'
import { TableNoteSheet } from './table-note-sheet'

/* ============================================================
   Шапка экрана «Официант»: логотип + связь, ровно 3 официанта,
   сетка 12 столов со статус-точками, тумблер ВИП, комментарий.
   ============================================================ */

const STATUS_TEXT: Record<TableStatus, string> = {
  free: 'свободен',
  sent: 'отправлен',
  cooking: 'готовится',
  ready: 'на раздаче',
}

export function HeaderBar() {
  const connection = useAppStore((s) => s.connection)
  const waiterName = useAppStore((s) => s.waiterName)
  const setWaiterName = useAppStore((s) => s.setWaiterName)
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const orders = useAppStore((s) => s.orders)
  const vip = useAppStore((s) => s.drafts[selectedTableId]?.vip === true)
  const setDraftVip = useAppStore((s) => s.setDraftVip)
  const hasNote = useAppStore((s) => Boolean(s.drafts[selectedTableId]?.tableNote))

  const [noteOpen, setNoteOpen] = useState(false)

  const now = useNow(5000)
  const tableMap = buildTableMap(orders ?? [], now)

  return (
    <header className="flex flex-col gap-3">
      {/* Логотип + связь */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-logo text-[28px] font-bold leading-none tracking-wide text-[#D4AF37]">
            ВИТАЛИК
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Официант
          </span>
        </div>
        <ConnectionBadge connection={connection} />
      </div>

      {/* Официант — ровно трое */}
      <section aria-label="Выбор официанта">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Официант
        </div>
        <div className="grid grid-cols-3 gap-2">
          {WAITER_NAMES.map((name) => {
            const selected = waiterName === name
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                aria-label={`Официант ${name}`}
                onClick={() => setWaiterName(name)}
                className={cn(
                  'flex h-12 items-center justify-center rounded-xl text-[15px] font-bold transition-all active:scale-[0.98]',
                  selected
                    ? 'bg-[#D4AF37] text-[#14100A] shadow-lg shadow-[#D4AF37]/25'
                    : 'border border-[#262B35] bg-[#161922] text-zinc-300',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </section>

      {/* Столы 1–12 со статус-точками */}
      <section aria-label="Выбор стола">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Стол · точка — статус заказа
        </div>
        <div className="grid grid-cols-6 gap-2">
          {TABLES.map((t) => {
            const st = tableMap.get(t.id)
            const selected = selectedTableId === t.id
            const ariaLabel = st
              ? `${t.label} — ${STATUS_TEXT[st.status]}${st.overdue ? ', опоздание' : ''}`
              : t.label
            return (
              <button
                key={t.id}
                type="button"
                aria-label={ariaLabel}
                aria-pressed={selected}
                onClick={() => setSelectedTable(t.id)}
                className={cn(
                  'relative grid h-11 place-items-center rounded-xl text-[15px] font-extrabold transition-all active:scale-[0.98]',
                  selected
                    ? 'border-2 border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border border-[#262B35] bg-[#161922] text-zinc-300',
                )}
              >
                {t.short}
                {st && (
                  <span
                    className={cn(
                      'absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0D0F12]',
                      st.status === 'sent' && 'animate-pulse bg-yellow-400',
                      st.status === 'cooking' && 'bg-amber-500',
                      st.status === 'ready' && 'animate-pulse bg-emerald-400',
                    )}
                    aria-hidden
                  />
                )}
                {st?.overdue && (
                  <span
                    className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-[#0D0F12] bg-[#EF4444]"
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ВИП-тумблер + комментарий к заказу */}
      <div className="flex gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={vip}
          aria-label="ВИП / Заказчик — высший приоритет на кухне"
          onClick={() => setDraftVip(selectedTableId, !vip)}
          className={cn(
            'flex h-[52px] flex-1 items-center gap-3 rounded-2xl px-4 transition-all active:scale-[0.98]',
            vip ? 'vip-frame' : 'border border-[#262B35] bg-[#161922]',
          )}
        >
          <span className="text-lg leading-none" aria-hidden>
            ⭐
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
            <span
              className={cn(
                'text-[13px] font-extrabold uppercase tracking-wide',
                vip ? 'text-[#D4AF37]' : 'text-zinc-300',
              )}
            >
              ВИП / Заказчик
            </span>
            <span className="mt-1 text-[10px] font-semibold text-zinc-500">
              {vip ? 'Приоритет на кухне' : 'Обычный заказ'}
            </span>
          </span>
          <span
            className={cn(
              'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors',
              vip ? 'bg-gradient-to-r from-[#F5E29A] to-[#D4AF37]' : 'bg-[#232936]',
            )}
            aria-hidden
          >
            <span
              className={cn(
                'absolute top-[3px] h-5 w-5 rounded-full bg-[#F5F1E8] shadow transition-all',
                vip ? 'left-[23px]' : 'left-[3px]',
              )}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          aria-label="Комментарий к заказу"
          className={cn(
            'relative flex h-[52px] flex-1 items-center gap-3 rounded-2xl border px-4 transition-all active:scale-[0.98]',
            hasNote ? 'border-[#F59E0B]/50 bg-[#F59E0B]/10' : 'border-[#262B35] bg-[#161922]',
          )}
        >
          <MessageSquareText
            className={cn('h-5 w-5 shrink-0', hasNote ? 'text-[#F59E0B]' : 'text-zinc-400')}
          />
          <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
            <span
              className={cn(
                'text-[13px] font-extrabold uppercase tracking-wide',
                hasNote ? 'text-[#F59E0B]' : 'text-zinc-300',
              )}
            >
              Комментарий
            </span>
            <span className="mt-1 text-[10px] font-semibold text-zinc-500">
              {hasNote ? 'есть заметка' : 'к заказу'}
            </span>
          </span>
          {hasNote && (
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#F59E0B]" aria-hidden />
          )}
        </button>
      </div>

      <TableNoteSheet open={noteOpen} onOpenChange={setNoteOpen} />
    </header>
  )
}
