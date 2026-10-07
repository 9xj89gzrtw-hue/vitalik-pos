'use client'

import { useAppStore } from '@/lib/store'
import { buildBatch, pluralDishes, pluralTables } from '@/lib/derive'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Режим «Сводка цехов» (батчинг): суммирует одинаковые блюда
   по всему залу — «Жарим сразу 5 ростбифов!»
   Гарниры агрегируются: привязанные («к Утке») + отдельные.
   ============================================================ */

const SECTION_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  cold: '🥗',
  hot_appetizer: '🍤',
  hot_main: '🥩',
  garnish: '🥔',
  pastry: '🍰',
}

export function BatchBoard({ orders }: { orders: Order[] }) {
  const flash = useAppStore((s) => s.flash)
  const sections = buildBatch(orders)
  const liveTables = new Set(orders.filter((o) => o.status !== 'served').map((o) => o.tableId)).size
  const totalQty = sections.reduce((acc, s) => acc + s.totalQty, 0)
  const hasFresh = Object.keys(flash).length > 0

  if (sections.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.06] bg-[#161B23] px-6 py-12 text-center">
        <div className="text-5xl">📊</div>
        <div className="mt-3 font-display text-lg font-extrabold text-zinc-300">
          Цеха пусты
        </div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Как только появятся заказы в работе — здесь будет суммарная картина
          по всем столам: «Ростбиф: 5 шт. (Стол 2: 2, Стол 7: 1…)».
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-white/[0.07] bg-[#161B23] px-4 py-3">
        <div className="font-display text-[15px] font-extrabold text-zinc-200">
          {hasFresh ? '🔥 ' : ''}
          В работе: {pluralTables(liveTables)} · {pluralDishes(totalQty)}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold leading-relaxed text-zinc-500">
          Готовые и отданные блюда из сводки убраны — только то, что стоит на планке.
        </div>
      </div>

      {sections.map((section) => (
        <section
          key={section.key}
          className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#161B23]"
        >
          <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-zinc-400">
              <span className="text-base leading-none">{SECTION_EMOJI[section.key] ?? '🍽'}</span>
              {section.title}
            </h3>
            <span className="rounded-lg bg-[#242B36] px-2 py-1 text-[12px] font-black tabular-nums text-zinc-300">
              {section.totalQty} шт
            </span>
          </header>
          <ul className="flex flex-col gap-2 px-4 py-3">
            {section.rows.map((row) => (
              <li key={row.key} className="rounded-2xl bg-[#0F1115] px-3.5 py-3">
                <div className="font-display text-[21px] font-black leading-tight text-zinc-50">
                  {row.name} — {row.totalQty} шт
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.chips.map((chip, idx) => (
                    <span
                      key={`${row.key}-${idx}`}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[12px] font-bold',
                        chip.vip
                          ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-black'
                          : 'bg-[#242B36] text-zinc-300',
                      )}
                    >
                      {chip.vip ? '⚡ ' : ''}
                      {chip.label}: {chip.qty}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
