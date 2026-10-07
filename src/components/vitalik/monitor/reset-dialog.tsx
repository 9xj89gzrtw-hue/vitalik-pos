'use client'

import { useRef, useState } from 'react'
import { Delete, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ============================================================
   Утренний сброс: пин-код 0000 → обнуляет все активные чеки
   и счётчики, чтобы открыть новую смену с чистого листа.
   ============================================================ */

const PIN_LENGTH = 4

export function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const resetShift = useAppStore((s) => s.resetShift)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  /** переживает быстрые тапы без ре-рендера (без гонки замыканий) */
  const pinRef = useRef('')

  const close = () => {
    pinRef.current = ''
    setPin('')
    setError(false)
    onOpenChange(false)
  }

  const press = async (digit: string) => {
    if (busy || pinRef.current.length >= PIN_LENGTH) return
    const next = (pinRef.current + digit).slice(0, PIN_LENGTH)
    pinRef.current = next
    setPin(next)
    setError(false)
    if (next.length === PIN_LENGTH) {
      setBusy(true)
      const ok = await resetShift(next)
      setBusy(false)
      if (ok) {
        close()
      } else {
        pinRef.current = ''
        setError(true)
        setPin('')
      }
    }
  }

  const backspace = () => {
    pinRef.current = pinRef.current.slice(0, -1)
    setPin(pinRef.current)
    setError(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : close())}>
      <DialogContent className="max-w-[360px] rounded-3xl border-white/10 bg-[#161B23]">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 font-display text-lg font-extrabold">
            <ShieldCheck className="h-5 w-5 text-red-400" />
            Пин-код администратора
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-zinc-500">
            Введите 4-значный пин, чтобы обнулить все чеки и счётчики дня.
          </DialogDescription>
        </DialogHeader>

        {/* Точки пина */}
        <div
          className={cn(
            'mt-2 flex items-center justify-center gap-3',
            error && 'animate-shake',
          )}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all',
                i < pin.length
                  ? 'border-red-400 bg-red-400'
                  : 'border-zinc-600 bg-transparent',
              )}
            />
          ))}
        </div>
        {error && (
          <p className="text-center text-[12px] font-bold text-red-400">Неверный пин-код</p>
        )}

        {/* Клавиатура */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => void press(d)}
              className="h-14 rounded-2xl bg-[#1D232D] font-display text-2xl font-black text-zinc-100 transition-all active:scale-95 active:bg-[#242B36]"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={close}
            className="h-14 rounded-2xl bg-[#1D232D] text-[13px] font-bold text-zinc-400 transition-all active:scale-95"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void press('0')}
            className="h-14 rounded-2xl bg-[#1D232D] font-display text-2xl font-black text-zinc-100 transition-all active:scale-95 active:bg-[#242B36]"
          >
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Стереть"
            className="grid h-14 place-items-center rounded-2xl bg-[#1D232D] text-zinc-400 transition-all active:scale-95"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
