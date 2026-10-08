'use client'

import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useVitalik } from '@/lib/api-client'
import { haptic } from '@/lib/audio'
import { buildCookSections, buildSuflerHint } from '@/lib/derive'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Режим 1 — «Сводка цехов и Батчинг» (главный экран скорости):
   1. Умная подсказка суфлера — свободный повар + скопление порций.
   2. Частичное озвучивание: [-] [Озвучить +N] [+] | [ВСЁ В ОЧЕРЕДИ].
   3. Кнопка готовности: [✅ ОТМЕТИТЬ ГОТОВЫМИ: N ШТ.].
   ============================================================ */

export function BatchBoard({ orders }: { orders: Order[] }) {
  const { mutate } = useVitalik()
  const [steppers, setSteppers] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const sections = buildCookSections(orders)
  const hint = buildSuflerHint(orders)

  const announce = async (menuItemId: string, count?: number) => {
    if (busy) return
    setBusy(menuItemId)
    haptic(15)
    await mutate('/api/orders', { action: 'announce', menuItemId, count })
    setSteppers((s) => ({ ...s, [menuItemId]: 1 }))
    setBusy(null)
  }

  const markReady = async (menuItemId: string) => {
    if (busy) return
    setBusy(menuItemId)
    haptic([10, 30, 10])
    await mutate('/api/orders', { action: 'ready', menuItemId })
    setBusy(null)
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-14 text-center">
        <div className="text-5xl" aria-hidden>
          🧑‍🍳
        </div>
        <div className="mt-3 text-lg font-extrabold text-zinc-300">Кухня чиста 👌</div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Активных заказов нет. Новый чек озвучит зуммер
          <br />
          и красный баннер — до нажатия «ПРИНЯТЬ».
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 💡 Умная подсказка суфлера */}
      {hint && (
        <section
          aria-label="Умная подсказка суфлера"
          className="vip-frame rounded-3xl p-4"
        >
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#D4AF37]">
            💡 Умная подсказка суфлера
          </div>
          <p className="mt-2 text-[17px] font-black leading-snug text-[#F5F1E8]">
            👉 Свободен {hint.cookTitle} ({hint.station})
          </p>
          <p className="text-[19px] font-black leading-snug text-[#F5E29A]">
            Озвучь {hint.count}× {hint.name}
          </p>
          <p className="text-[13px] font-bold text-zinc-400">
            Столы: {hint.tables.join(', ')}
            {hint.vip && ' · ⭐ среди них ВИП'}
          </p>
          <button
            type="button"
            onClick={() => void announce(hint.menuItemId)}
            disabled={busy === hint.menuItemId}
            className="mt-3 flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] text-[15px] font-black text-[#14100A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 active:scale-[0.98]"
          >
            <Megaphone className="h-5 w-5" />
            ОЗВУЧИТЬ ПОДСКАЗКУ В 1 КЛИК
          </button>
        </section>
      )}

      {/* Цеха (3 повара) */}
      {sections.map((section) => (
        <section key={section.cook} aria-label={section.title} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#262B35] bg-[#161922] px-4 py-3">
            <div className="text-[15px] font-black text-[#F5F1E8]">
              👨‍🍳 {section.title}
              <span className="ml-2 text-[12px] font-bold text-zinc-500">{section.station}</span>
            </div>
            {section.cooking > 0 ? (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1 text-[12px] font-black text-amber-300">
                🔥 Занят: {section.cooking}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-[12px] font-black text-emerald-300">
                🟢 Свободен
              </span>
            )}
          </div>

          {section.groups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[#262B35] px-4 py-3 text-center text-[12px] font-bold text-zinc-600">
              Нет позиций в работе
            </p>
          )}

          {section.groups
            .filter((g) => g.queued > 0 || g.cooking > 0)
            .map((g) => {
              const step = Math.min(Math.max(steppers[g.menuItemId] ?? 1, 1), Math.max(1, g.queued))
              const isBusy = busy === g.menuItemId
              return (
                <div
                  key={g.menuItemId}
                  className={cn(
                    'flex flex-col gap-2 rounded-3xl border p-4',
                    g.vip ? 'vip-frame' : 'border-[#262B35] bg-[#161922]',
                  )}
                >
                  {/* Заголовок блюда */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[19px] font-black uppercase leading-none tracking-tight text-[#F5F1E8]">
                      {g.name}
                      {g.vip && <span className="ml-2 align-middle text-[13px] text-[#D4AF37]">⭐</span>}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#0D0F12] px-3 py-1 text-[13px] font-black tabular-nums text-zinc-400">
                      Всего: {g.total}
                    </span>
                  </div>

                  {/* Озвучено и готовится */}
                  {g.cooking > 0 && (
                    <p className="text-[15px] font-black leading-snug text-amber-300">
                      🔥 Озвучено и готовится: {g.cooking} шт.
                      <span className="text-[13px] font-bold text-amber-300/70">
                        {' '}
                        ({g.cookingTables.map((t) => `Стол ${t.table}: ${t.qty}`).join(', ')})
                      </span>
                    </p>
                  )}

                  {/* В очереди */}
                  {g.queued > 0 && (
                    <p className="text-[15px] font-black leading-snug text-zinc-300">
                      ⏳ В очереди: {g.queued} шт.
                      <span className="text-[13px] font-bold text-zinc-500">
                        {' '}
                        ({g.queuedTables.map((t) => `Стол ${t.table}: ${t.qty}`).join(', ')})
                      </span>
                    </p>
                  )}

                  {/* Частичное озвучивание */}
                  {g.queued > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Меньше порций к озвучке"
                        onClick={() => {
                          haptic(8)
                          setSteppers((s) => ({ ...s, [g.menuItemId]: Math.max(1, step - 1) }))
                        }}
                        className="grid h-[52px] w-[56px] place-items-center rounded-2xl border border-[#262B35] bg-[#0D0F12] text-2xl font-black text-zinc-300 active:scale-95"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void announce(g.menuItemId, step)}
                        className="h-[52px] flex-1 rounded-2xl bg-amber-500 text-[15px] font-black text-[#201400] shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.98]"
                      >
                        🔥 Озвучить +{step}
                      </button>
                      <button
                        type="button"
                        aria-label="Больше порций к озвучке"
                        onClick={() => {
                          haptic(8)
                          setSteppers((s) => ({
                            ...s,
                            [g.menuItemId]: Math.min(Math.max(1, g.queued), step + 1),
                          }))
                        }}
                        className="grid h-[52px] w-[56px] place-items-center rounded-2xl border border-[#262B35] bg-[#0D0F12] text-2xl font-black text-zinc-300 active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void announce(g.menuItemId)}
                        className="h-[52px] flex-1 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 text-[13px] font-black uppercase leading-tight text-amber-300 disabled:opacity-50 active:scale-[0.98]"
                      >
                        Озвучить
                        <br />
                        всё ({g.queued})
                      </button>
                    </div>
                  )}

                  {/* Готовность */}
                  {g.cooking > 0 && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void markReady(g.menuItemId)}
                      className="h-[56px] rounded-2xl bg-emerald-500 text-[16px] font-black text-[#05140E] shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-[0.98]"
                    >
                      ✅ ОТМЕТИТЬ ГОТОВЫМИ: {g.cooking} ШТ.
                    </button>
                  )}
                </div>
              )
            })}
        </section>
      ))}
    </div>
  )
}
