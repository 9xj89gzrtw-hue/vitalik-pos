'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVitalik } from '@/lib/api-client'
import { haptic, playResetBlip } from '@/lib/audio'
import { formatClock } from '@/lib/derive'
import { MENU } from '@/lib/menu'
import { cn } from '@/lib/utils'

/* ============================================================
   Экран 3 — АНАЛИТИКА И ИСТОРИЯ (открыт всем):
   ① точный счётчик приготовленных порций по каждому блюду;
   ② журнал закрытых чеков со временем и официантами;
   ③ [🗑 Сбросить тестовые данные] — защита PIN-кодом 0000.
   ============================================================ */

export function AnalyticsScreen() {
  const { state, synced, mutate } = useVitalik()
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [resetting, setResetting] = useState(false)

  const counters = state?.counters ?? {}
  const history = state?.history ?? []
  const totalPortions = Object.values(counters).reduce((a, b) => a + b, 0)

  const categories = new Map<string, typeof MENU>()
  for (const dish of MENU) {
    const list = categories.get(dish.category) ?? []
    list.push(dish)
    categories.set(dish.category, list)
  }

  const doReset = async () => {
    if (pin !== '0000') {
      setShake(true)
      haptic([30, 50, 30])
      setTimeout(() => setShake(false), 450)
      return
    }
    setResetting(true)
    haptic([20, 60, 20])
    const res = await mutate('/api/reset', { pin })
    setResetting(false)
    if (res) {
      playResetBlip()
      toast.success('Смена начата — все данные сброшены 🧹')
      setPinOpen(false)
      setPin('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D4AF37]/15 text-lg" aria-hidden>
            📊
          </span>
          <div className="leading-none">
            <div className="font-logo text-[20px] font-black tracking-tight text-[#D4AF37]">
              ВИТАЛИК · АНАЛИТИКА
            </div>
            <div className="mt-1 text-[11px] font-bold text-zinc-500">
              Счётчики за смену · {history.length} закрытых чеков
            </div>
          </div>
        </div>
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            synced ? 'bg-emerald-500/70' : 'animate-pulse bg-amber-500/80',
          )}
          title={synced ? 'Синхронизировано' : 'Возобновляем связь…'}
          aria-hidden
        />
      </header>

      {/* Итоги */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[#262B35] bg-[#161922] p-4 text-center">
          <div className="text-[28px] font-black tabular-nums text-[#D4AF37]">{totalPortions}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            порций приготовлено
          </div>
        </div>
        <div className="rounded-2xl border border-[#262B35] bg-[#161922] p-4 text-center">
          <div className="text-[28px] font-black tabular-nums text-emerald-300">{history.length}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            чеков закрыто
          </div>
        </div>
      </div>

      {/* ① Счётчик по каждому блюду */}
      <section aria-label="Приготовлено за сегодня">
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
          Приготовлено за сегодня
        </h2>
        <div className="flex flex-col gap-3">
          {[...categories.entries()].map(([category, dishes]) => {
            const catTotal = dishes.reduce((acc, d) => acc + (counters[d.id] ?? 0), 0)
            return (
              <div key={category} className="rounded-2xl border border-[#262B35] bg-[#161922] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-black uppercase tracking-wider text-zinc-400">
                    {category}
                  </span>
                  <span className="text-[12px] font-black tabular-nums text-[#D4AF37]">{catTotal}</span>
                </div>
                <div className="flex flex-col divide-y divide-[#262B35]/60">
                  {dishes.map((dish) => {
                    const count = counters[dish.id] ?? 0
                    return (
                      <div key={dish.id} className="flex items-center justify-between gap-3 py-2">
                        <span className={cn('min-w-0 truncate text-[13.5px] font-bold', count > 0 ? 'text-[#F5F1E8]' : 'text-zinc-600')}>
                          {dish.name}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-lg px-2.5 py-1 text-[14px] font-black tabular-nums',
                            count > 0 ? 'bg-[#D4AF37]/15 text-[#F5E29A]' : 'bg-[#0D0F12] text-zinc-600',
                          )}
                        >
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ② Журнал закрытых чеков */}
      <section aria-label="Журнал закрытых чеков">
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
          Журнал закрытых чеков
        </h2>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#262B35] px-4 py-8 text-center text-[13px] font-bold text-zinc-600">
            Пока ни одного закрытого чека
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto nice-scroll flex flex-col gap-2 rounded-2xl border border-[#262B35] bg-[#161922] p-3">
            {history.map((check) => (
              <article
                key={check.orderId}
                className={cn(
                  'rounded-xl border p-3',
                  check.vip ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#262B35] bg-[#0D0F12]',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-black text-[#F5F1E8]">Стол {check.table}</span>
                  <span className="text-[12px] font-bold text-zinc-400">{check.waiter}</span>
                  {check.vip && <span className="text-[11px] font-black text-[#D4AF37]">⭐ ВИП</span>}
                  <span className="ml-auto tabular-nums text-[12px] font-black text-emerald-300">
                    закрыт {formatClock(check.closedAt)}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] font-bold leading-snug text-zinc-400">
                  {check.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                </p>
                {check.comment && (
                  <p className="mt-0.5 text-[11px] font-bold text-amber-300/80">💬 {check.comment}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ③ Сброс тестовых данных */}
      <button
        type="button"
        onClick={() => {
          haptic(12)
          setPinOpen(true)
        }}
        className="mt-2 h-[56px] rounded-2xl border-2 border-[#EF4444]/60 bg-[#EF4444]/10 text-[15px] font-black text-[#EF4444] active:scale-[0.98]"
      >
        🗑 СБРОСИТЬ ТЕСТОВЫЕ ДАННЫЕ И НАЧАТЬ СМЕНУ
      </button>

      {/* PIN-диалог */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[520px] rounded-3xl border-[#262B35] bg-[#161922] text-[#F5F1E8]">
          <DialogHeader>
            <DialogTitle className="text-[#EF4444]">Подтверждение сброса</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] font-bold leading-relaxed text-zinc-400">
            Будут очищены: все заказы, счётчики, стоп-листы и журнал чеков.
            Введите PIN-код для подтверждения.
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className={cn(
              'mt-2 h-[60px] w-full rounded-2xl border border-[#262B35] bg-[#0D0F12] text-center text-[26px] font-black tracking-[0.5em] text-[#F5F1E8] placeholder:text-zinc-700',
              shake && 'animate-shake border-[#EF4444]',
            )}
            aria-label="PIN-код"
          />
          <button
            type="button"
            disabled={resetting || pin.length < 4}
            onClick={() => void doReset()}
            className="mt-2 h-[56px] rounded-2xl bg-[#EF4444] text-[16px] font-black text-white disabled:opacity-40 active:scale-[0.98]"
          >
            {resetting ? 'Сбрасываем…' : 'ПОДТВЕРДИТЬ СБРОС'}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
