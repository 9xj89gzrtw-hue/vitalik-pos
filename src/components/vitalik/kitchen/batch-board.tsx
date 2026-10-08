'use client'

import { buildBatch, pluralDishes, pluralTables } from '@/lib/derive'
import type { Order } from '@/lib/types'

/* ============================================================
   Режим 3 «Батчинг (сводка цеха)»: агрегация по buildBatch —
   блюда в работе (готовые исключены) по всем активным столам.
   Смысл: шеф одним криком запускает партию
   («Жарим сразу 5 ростбифов!»).
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
  const sections = buildBatch(orders ?? [])
  const live = orders ?? []
  const liveTables = new Set(
    live.filter((o) => o.status !== 'served').map((o) => o.tableId),
  ).size
  const totalQty = sections.reduce((acc, s) => acc + s.totalQty, 0)

  if (sections.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262B35] bg-[#161922] px-6 py-14 text-center">
        <div className="text-5xl" aria-hidden>
          📦
        </div>
        <div className="mt-3 text-lg font-extrabold text-zinc-300">Нет блюд в работе</div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          Сводка появится, когда шеф примет заказы:
          <br />
          «Ростбиф: 5 шт. — Стол 2: 2, Стол 7 [ВИП]: 1, Стол 11: 2».
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Итог смены на планке */}
      <div className="rounded-2xl border border-[#262B35] bg-[#161922] px-4 py-3">
        <div className="text-[15px] font-extrabold text-zinc-200">
          🔥 Планка: {pluralTables(liveTables)} · {pluralDishes(totalQty)}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold leading-relaxed text-zinc-500">
          Готовые и отданные блюда исключены — только то, что стоит на планке.
        </div>
      </div>

      {sections.map((section) => (
        <section
          key={section.key}
          aria-label={section.title}
          className="overflow-hidden rounded-3xl border border-[#262B35] bg-[#161922]"
        >
          <header className="flex items-center justify-between border-b border-[#262B35] px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-zinc-400">
              <span className="text-base leading-none" aria-hidden>
                {SECTION_EMOJI[section.key] ?? '🍽'}
              </span>
              {section.title}
            </h3>
            <span className="rounded-lg bg-[#232936] px-2 py-1 text-[12px] font-black tabular-nums text-zinc-300">
              {section.totalQty} шт
            </span>
          </header>

          <ul className="flex flex-col gap-2 px-4 py-3">
            {section.rows.map((row) => (
              <li key={row.key} className="rounded-2xl bg-[#0F1115] px-3.5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xl font-black leading-tight text-[#F5F1E8]">
                    {row.name}
                  </span>
                  <span className="shrink-0 text-2xl font-black tabular-nums text-emerald-400">
                    {row.totalQty} шт.
                  </span>
                </div>
                {/* Чипы столов: «Стол 2: 2 · Стол 7 [ВИП]: 1 · Стол 11: 2» */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {row.chips.map((chip, idx) =>
                    chip.vip ? (
                      <span
                        key={`${row.key}-${idx}`}
                        className="vip-chip"
                      >
                        ⭐ Стол {chip.label}: {chip.qty}
                      </span>
                    ) : (
                      <span
                        key={`${row.key}-${idx}`}
                        className="rounded-full bg-[#232936] px-2.5 py-1 text-[12px] font-bold text-zinc-300"
                      >
                        Стол {chip.label}: {chip.qty}
                      </span>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
