'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { TABLE_NOTE_PRESETS, tableLabelOf } from '@/lib/menu'

/* ============================================================
   «Комментарий к заказу» (vaul Drawer): пресеты чипсами +
   свободный ввод до 140 символов → store.setDraftTableNote.
   ============================================================ */

export function TableNoteSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const selectedTableId = useAppStore((s) => s.selectedTableId)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[520px] rounded-t-3xl bg-[#161922] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="text-lg font-extrabold leading-snug text-[#F5F1E8]">
            Комментарий к заказу · {tableLabelOf(selectedTableId)}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-zinc-500">
            Увидит шеф в тикете. Например: «Отдать строго после тоста», «Детям первым».
          </DrawerDescription>
        </DrawerHeader>
        <TableNoteBody tableId={selectedTableId} onDone={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Тело шита монтируется заново при каждом открытии (Radix/vaul
 * размонтирует содержимое закрытого Drawer), поэтому локальное
 * поле корректно инициализируется заметкой стола без эффектов.
 */
function TableNoteBody({ tableId, onDone }: { tableId: string; onDone: () => void }) {
  const setDraftTableNote = useAppStore((s) => s.setDraftTableNote)
  const [text, setText] = useState(
    () => useAppStore.getState().drafts[tableId]?.tableNote ?? '',
  )

  const applyText = (value: string) => {
    setText(value)
    setDraftTableNote(tableId, value)
  }

  const applyPreset = (preset: string) => {
    const base = text.trim()
    applyText(base ? `${base}, ${preset}` : preset)
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={text}
        onChange={(e) => applyText(e.target.value)}
        placeholder="Пожелание зала к заказу…"
        maxLength={140}
        className="min-h-[90px] rounded-2xl border-[#262B35] bg-[#0D0F12] text-[15px] text-[#F5F1E8]"
        aria-label="Комментарий к заказу"
      />

      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
        <span>Тап по чипу — добавить к заметке</span>
        <span className="tabular-nums">{text.length}/140</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABLE_NOTE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Добавить «${preset}»`}
            onClick={() => applyPreset(preset)}
            className="flex h-11 items-center rounded-full border border-[#262B35] bg-[#232936] px-4 text-[13px] font-bold text-zinc-300 transition-all active:scale-[0.98]"
          >
            {preset}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-1 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#10B981] text-[15px] font-extrabold text-[#05140E] transition-all active:scale-[0.98]"
      >
        Готово
      </button>
    </div>
  )
}
