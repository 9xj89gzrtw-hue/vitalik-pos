'use client'

import { useRef, useState, type FocusEvent } from 'react'
import { Check, MessageSquareText, Minus, Plus, Trash2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CheckItem } from '@/lib/types'
import { usePosStore } from '@/lib/store'

const COMMENT_PRESETS = ['Без лука', 'Без зелени', 'Не остро', '½ порции'] as const

interface CheckLineProps {
  table: number
  line: CheckItem
  /** индекс в чеке — для лёгкой stagger-задержки появления */
  index: number
}

const STEP_BTN =
  'grid size-8 place-items-center rounded-lg border border-border bg-card text-foreground transition active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60'

/** Строка чека: степпер количества, название, удаление, комментарий */
export function CheckLine({ table, line, index }: CheckLineProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const updateCheckQty = usePosStore((s) => s.updateCheckQty)
  const setCheckComment = usePosStore((s) => s.setCheckComment)
  const removeCheckItem = usePosStore((s) => s.removeCheckItem)

  const startEditing = () => {
    setDraft(line.comment ?? '')
    setEditing(true)
  }

  const commit = () => {
    setCheckComment(table, line.menuItemId, draft)
    setEditing(false)
  }

  const cancelEditing = () => {
    setDraft(line.comment ?? '')
    setEditing(false)
  }

  /* блюр инпута: сохраняем, только если фокус ушёл наружу редактора
     (клик по пресету/кнопкам внутри — не считается) */
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && rootRef.current?.contains(next)) return
    commit()
  }

  return (
    <div
      ref={rootRef}
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
      className="animate-fade-up rounded-xl border border-border bg-secondary/60 p-2.5"
    >
      {/* верхний ряд: степпер + название + удаление */}
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Убрать одну порцию: ${line.name}`}
            onClick={() => updateCheckQty(table, line.menuItemId, -1)}
            className={STEP_BTN}
          >
            <Minus className="size-3.5" aria-hidden="true" />
          </button>
          <span className="w-7 text-center font-extrabold tabular-nums">{line.qty}</span>
          <button
            type="button"
            aria-label={`Добавить одну порцию: ${line.name}`}
            onClick={() => updateCheckQty(table, line.menuItemId, 1)}
            className={STEP_BTN}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-tight">
          {line.name}
        </span>
        <button
          type="button"
          aria-label={`Удалить из чека: ${line.name}`}
          onClick={() => removeCheckItem(table, line.menuItemId)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-red-600/80 transition hover:bg-red-500/10 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* комментарий: редактирование / чип / «+ комментарий» */}
      {editing ? (
        <div className="mt-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEditing()
              }
            }}
            onBlur={handleBlur}
            placeholder="Например: без лука"
            maxLength={80}
            autoFocus
            aria-label={`Комментарий к блюду: ${line.name}`}
            className="h-9 rounded-lg text-xs"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COMMENT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDraft(preset)}
                className="h-7 rounded-full border border-border bg-secondary px-2.5 text-[11px] font-medium text-foreground/80 transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label="Отменить комментарий"
              onClick={cancelEditing}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Сохранить комментарий"
              onClick={commit}
              className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Check className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : line.comment ? (
        <button
          type="button"
          onClick={startEditing}
          aria-label={`Изменить комментарий: ${line.comment}`}
          className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-left text-[11.5px] font-semibold text-amber-700 transition active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <MessageSquareText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{line.comment}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="mt-1.5 inline-flex min-h-9 items-center rounded-lg px-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          + комментарий
        </button>
      )}
    </div>
  )
}
