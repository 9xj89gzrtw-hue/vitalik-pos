'use client'

import { useMemo } from 'react'
import { SearchX } from 'lucide-react'
import { itemsForPeriod } from '@/lib/menu'
import { usePosStore } from '@/lib/store'
import { MenuCard } from './menu-card'

/** Сетка блюд: период → категория → поиск → сортировка по курсу подачи */
export function MenuGrid() {
  const period = usePosStore((s) => s.period)
  const category = usePosStore((s) => s.category)
  const search = usePosStore((s) => s.search)
  const setSearch = usePosStore((s) => s.setSearch)
  const setCategory = usePosStore((s) => s.setCategory)

  const items = useMemo(() => {
    let list = itemsForPeriod(period)
    if (category) list = list.filter((i) => i.category === category)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description?.toLowerCase().includes(q) ?? false),
      )
    }
    /* стабильная сортировка сохраняет исходный порядок внутри курса */
    return [...list].sort((a, b) => a.coursePriority - b.coursePriority)
  }, [period, category, search])

  if (items.length === 0) {
    const hasFilters = search.trim() !== '' || category !== null
    return (
      <div className="animate-fade-up mx-auto flex max-w-md flex-col items-center gap-2 py-16 text-center">
        <SearchX className="size-10 text-muted-foreground/50" aria-hidden="true" />
        <p className="text-sm font-semibold text-muted-foreground">Ничего не найдено</p>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategory(null)
            }}
            className="mt-1 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-primary underline-offset-4 transition hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <MenuCard key={item.id} item={item} index={index} />
      ))}
    </div>
  )
}
