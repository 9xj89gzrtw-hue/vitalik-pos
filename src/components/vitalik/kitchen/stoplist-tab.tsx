'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MENU } from '@/lib/menu'
import { useAppStore } from '@/lib/store'
import { isDishAvailable, stopInfo } from '@/lib/derive'
import type { MenuItem, StopList } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Режим 2 «Стоп-лист и Остатки»: все блюда MENU по категориям.
   Тумблер [🚫 В СТОП] / [✅ Снять со стопа] и лимит остатка
   (быстрые чипы + ввод 0–999). Изменения летят официантам
   мгновенно через хаб (vk:stop:set / vk:stop:remaining).
   ============================================================ */

const CATEGORY_ORDER: readonly string[] = [
  'Завтраки',
  'САЛАТЫ',
  'ГОРЯЧИЕ ЗАКУСКИ',
  'ГОРЯЧИЕ БЛЮДА',
  'ГАРНИРЫ',
  'ДЕСЕРТЫ',
]

const PERIOD_LABEL: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
}

const QUICK_ADDS: readonly number[] = [2, 5, 10]

/** Только цифры, 0–999 */
function sanitizeRemainingInput(raw: string): string {
  const digits = raw.replace(/\D+/g, '').slice(0, 3)
  if (!digits) return ''
  return String(Math.min(999, Math.max(0, parseInt(digits, 10))))
}

function parseRemaining(raw: string): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? Math.min(999, Math.max(0, n)) : null
}

export function StoplistTab() {
  const stopList = useAppStore((s) => s.stopList)

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: MENU.filter((m) => m.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Подсказка */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.07] px-4 py-3">
        <Zap className="h-4 w-4 shrink-0 text-[#D4AF37]" aria-hidden />
        <p className="text-[12px] font-bold leading-snug text-amber-200/90">
          Изменения видны официантам мгновенно
        </p>
      </div>

      {groups.map((group) => (
        <section
          key={group.cat}
          aria-label={group.cat}
          className="overflow-hidden rounded-3xl border border-[#262B35] bg-[#161922]"
        >
          <header className="flex items-center justify-between border-b border-[#262B35] px-4 py-2.5">
            <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-zinc-400">
              {group.cat}
            </h3>
            <span className="rounded-lg bg-[#232936] px-2 py-1 text-[11px] font-bold text-zinc-400">
              {group.items.length} блюд
            </span>
          </header>
          <div className="flex flex-col gap-2 px-3 py-3">
            {group.items.map((item) => (
              <StopRow key={item.id} item={item} stopList={stopList} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/* Строка блюда: статус + управление стопом и остатком */
function StopRow({ item, stopList }: { item: MenuItem; stopList: StopList }) {
  const setStopDish = useAppStore((s) => s.setStopDish)
  const setRemaining = useAppStore((s) => s.setRemaining)
  const [panelOpen, setPanelOpen] = useState(false)
  const [value, setValue] = useState('')

  const control = stopInfo(stopList, item.id)
  const stopped = control.stopped
  const remaining = control.remaining
  const available = isDishAvailable(stopList, item.id)
  const parsed = parseRemaining(value)

  const openPanel = () => {
    setValue(remaining != null ? String(remaining) : '')
    setPanelOpen(true)
  }

  const closePanel = () => setPanelOpen(false)

  const onSave = () => {
    if (parsed == null) return
    void setRemaining(item.id, parsed)
    closePanel()
  }

  const onRemoveLimit = () => {
    void setRemaining(item.id, null)
    closePanel()
  }

  return (
    <div
      className={cn(
        'min-h-[56px] rounded-2xl border bg-[#0F1115] p-3',
        stopped ? 'border-[#EF4444]/60' : 'border-[#262B35]',
      )}
    >
      {/* Название + статусные бейджи */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-extrabold leading-tight text-[#F5F1E8]">
            {item.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <span>{item.time}</span>
            <span aria-hidden>·</span>
            <span>{PERIOD_LABEL[item.period] ?? item.period}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1" aria-label="Статус блюда">
          {stopped && (
            <span className="rounded-full bg-[#EF4444]/15 px-2.5 py-1 text-[11px] font-black text-red-400">
              🚫 В СТОПЕ
            </span>
          )}
          {remaining != null && (
            <span className="rounded-full bg-[#F59E0B]/15 px-2.5 py-1 text-[11px] font-black text-amber-300">
              {remaining === 0 ? '⚠️ Осталось: 0 — стоп' : `⚠️ Осталось: ${remaining} шт.`}
            </span>
          )}
          {!stopped && remaining == null && (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black',
                available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  available ? 'bg-emerald-400' : 'bg-zinc-400',
                )}
                aria-hidden
              />
              {available ? 'доступен' : 'скрыт из зала'}
            </span>
          )}
        </div>
      </div>

      {/* Управление */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void setStopDish(item.id, !stopped)}
          aria-label={
            stopped ? `Снять со стопа — ${item.name}` : `Поставить в стоп — ${item.name}`
          }
          className={cn(
            'flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-black transition-all active:scale-[0.98]',
            stopped
              ? 'bg-emerald-500 text-[#05140E] shadow-lg shadow-emerald-500/20'
              : 'border-2 border-[#EF4444]/60 bg-[#EF4444]/10 text-red-400',
          )}
        >
          {stopped ? '✅ Снять со стопа' : '🚫 В СТОП'}
        </button>
        <button
          type="button"
          onClick={() => (panelOpen ? closePanel() : openPanel())}
          aria-expanded={panelOpen}
          aria-controls={`remaining-panel-${item.id}`}
          aria-label={`Задать остаток — ${item.name}`}
          className={cn(
            'flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 text-[13px] font-black transition-all active:scale-[0.98]',
            panelOpen
              ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-amber-300'
              : 'border-[#F59E0B]/50 bg-[#F59E0B]/10 text-amber-300',
          )}
        >
          ⚠️ Задать остаток
        </button>
      </div>

      {/* Инлайн-панель остатка */}
      {panelOpen && (
        <div
          id={`remaining-panel-${item.id}`}
          className="mt-2 rounded-xl border border-[#262B35] bg-[#161922] p-3"
        >
          <div className="flex items-center gap-2">
            {QUICK_ADDS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setValue(sanitizeRemainingInput(String((parseRemaining(value) ?? 0) + n)))
                }
                aria-label={`Прибавить ${n} к остатку`}
                className="h-11 shrink-0 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 text-[14px] font-black text-amber-300 transition-all active:scale-95"
              >
                +{n}
              </button>
            ))}
            <Input
              value={value}
              onChange={(e) => setValue(sanitizeRemainingInput(e.target.value))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="0–999"
              aria-label={`Остаток порций — ${item.name}`}
              autoComplete="off"
              className="ml-auto h-11 w-[104px] rounded-xl border-[#262B35] bg-[#0F1115] text-center text-lg font-black tabular-nums text-[#F5F1E8]"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={parsed == null}
              aria-label={`Сохранить остаток — ${item.name}`}
              className="h-[52px] flex-[2] rounded-xl bg-[#F59E0B] text-[14px] font-black text-[#201400] shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Сохранить{parsed != null ? ` · ${parsed} шт.` : ''}
            </button>
            {remaining != null && (
              <button
                type="button"
                onClick={onRemoveLimit}
                aria-label={`Снять лимит остатка — ${item.name}`}
                className="h-[52px] flex-1 rounded-xl bg-[#232936] text-[13px] font-black text-zinc-300 transition-all active:scale-[0.98]"
              >
                Снять лимит
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-snug text-zinc-500">
            При остатке 0 блюдо автоматически уходит в стоп.
          </p>
        </div>
      )}
    </div>
  )
}
