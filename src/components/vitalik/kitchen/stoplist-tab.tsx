'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useVitalik } from '@/lib/api-client'
import { haptic } from '@/lib/audio'
import { MENU } from '@/lib/menu'
import { cn } from '@/lib/utils'

/* ============================================================
   Режим 3 — «Стоп-лист и Остатки»: у каждого блюда меню
   [В СТОП] / [СНЯТЬ СО СТОПА] и [Задать лимит порций].
   При достижении лимита 0 блюдо автоматически уходит в стоп.
   ============================================================ */

export function StoplistTab() {
  const { state, mutate } = useVitalik()
  const [limitEdit, setLimitEdit] = useState<string | null>(null)
  const [limitValue, setLimitValue] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const stoplist = state?.stoplist ?? {}

  const toggleStop = async (menuItemId: string, stopped: boolean) => {
    if (busy) return
    setBusy(menuItemId)
    haptic(12)
    const res = await mutate('/api/stoplist', { action: 'setStopped', menuItemId, stopped })
    setBusy(null)
    if (res) {
      const dish = MENU.find((m) => m.id === menuItemId)
      toast.success(stopped ? `«${dish?.short}» — В СТОПЕ` : `«${dish?.short}» — снова в продаже`)
    }
  }

  const saveLimit = async (menuItemId: string) => {
    if (busy) return
    const raw = limitValue.trim()
    const limit = raw === '' ? null : Number(raw)
    setBusy(menuItemId)
    haptic(12)
    const res = await mutate('/api/stoplist', { action: 'setLimit', menuItemId, limit })
    setBusy(null)
    if (res) {
      const dish = MENU.find((m) => m.id === menuItemId)
      toast.success(limit == null ? `Лимит «${dish?.short}» снят` : `Лимит «${dish?.short}»: ${limit} порц.`)
      setLimitEdit(null)
      setLimitValue('')
    }
  }

  // группы по категориям в порядке меню
  const groups = new Map<string, typeof MENU>()
  for (const dish of MENU) {
    const list = groups.get(dish.category) ?? []
    list.push(dish)
    groups.set(dish.category, list)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl border border-[#262B35] bg-[#161922] px-4 py-3 text-[12px] font-bold leading-relaxed text-zinc-500">
        Блюдо «в стопе» — официанты не могут его заказать. Лимит порций списывается
        автоматически при заказе; на 0 блюдо уходит в стоп.
      </p>

      {[...groups.entries()].map(([category, dishes]) => (
        <section key={category} aria-label={category} className="flex flex-col gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
            {category}
          </h3>
          {dishes.map((dish) => {
            const entry = stoplist[dish.id] ?? { stopped: false, limit: null, remaining: null }
            const editing = limitEdit === dish.id
            const isBusy = busy === dish.id
            return (
              <div
                key={dish.id}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border p-4',
                  entry.stopped
                    ? 'border-[#EF4444]/50 bg-[#161922]'
                    : 'border-[#262B35] bg-[#161922]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={cn('text-[15px] font-bold leading-snug', entry.stopped ? 'text-red-400' : 'text-[#F5F1E8]')}>
                      {dish.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {entry.stopped && (
                        <span className="rounded-lg bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-black text-[#EF4444]">
                          🚫 В СТОПЕ
                        </span>
                      )}
                      {entry.limit != null && (
                        <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-300">
                          ⚠️ Осталось: {entry.remaining ?? 0} из {entry.limit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void toggleStop(dish.id, !entry.stopped)}
                    className={cn(
                      'h-[48px] flex-1 rounded-2xl text-[13px] font-black active:scale-[0.98] disabled:opacity-50',
                      entry.stopped
                        ? 'bg-emerald-500/90 text-[#05140E]'
                        : 'border border-[#EF4444]/50 bg-[#EF4444]/10 text-[#EF4444]',
                    )}
                  >
                    {entry.stopped ? '✅ СНЯТЬ СО СТОПА' : '🚫 В СТОП'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic(8)
                      if (editing) {
                        setLimitEdit(null)
                        setLimitValue('')
                      } else {
                        setLimitEdit(dish.id)
                        setLimitValue(entry.limit != null ? String(entry.limit) : '')
                      }
                    }}
                    className={cn(
                      'h-[48px] flex-1 rounded-2xl border text-[13px] font-black active:scale-[0.98]',
                      editing
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#F5E29A]'
                        : 'border-[#262B35] bg-[#0D0F12] text-zinc-400',
                    )}
                  >
                    ⚖️ Задать лимит порций
                  </button>
                </div>

                {editing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      placeholder="Пусто = без лимита"
                      className="h-[52px] w-full rounded-2xl border border-[#262B35] bg-[#0D0F12] px-4 text-[16px] font-black tabular-nums text-[#F5F1E8] placeholder:text-zinc-600"
                      aria-label="Лимит порций"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void saveLimit(dish.id)}
                      className="h-[52px] shrink-0 rounded-2xl bg-[#D4AF37] px-5 text-[14px] font-black text-[#14100A] disabled:opacity-50 active:scale-95"
                    >
                      Сохранить
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
