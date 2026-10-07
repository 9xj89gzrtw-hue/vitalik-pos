'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePosStore } from '@/lib/store'

/** Ряд 4 шапки: поиск по названию и описанию блюд */
export function SearchField() {
  const search = usePosStore((s) => s.search)
  const setSearch = usePosStore((s) => s.setSearch)

  return (
    <div className="px-4 pb-1 pt-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск блюда…"
          aria-label="Поиск блюда"
          className="h-11 rounded-xl border-border bg-card pl-9 pr-10"
        />
        {search ? (
          <button
            type="button"
            aria-label="Очистить поиск"
            onClick={() => setSearch('')}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:text-foreground active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
