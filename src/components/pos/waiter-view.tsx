'use client'

import { ArrowLeftRight, UtensilsCrossed } from 'lucide-react'
import { ConnectionDot } from '@/components/pos/connection-dot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePosStore } from '@/lib/store'
import { CategoryChips } from './waiter/category-chips'
import { CheckSheet } from './waiter/check-sheet'
import { MenuGrid } from './waiter/menu-grid'
import { PeriodToggle } from './waiter/period-toggle'
import { SearchField } from './waiter/search-field'
import { SentBanner } from './waiter/sent-banner'
import { TableBar } from './waiter/table-bar'

/** Экран официанта: столы → меню → черновик чека → отправка на кухню */
export function WaiterView() {
  const setRole = usePosStore((s) => s.setRole)

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <SentBanner />

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        {/* Ряд 1: бренд · статус связи · смена роли */}
        <div className="flex h-14 items-center gap-2.5 px-4">
          <div
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <UtensilsCrossed className="size-5" strokeWidth={2.1} />
          </div>
          <h1 className="font-display text-lg font-extrabold tracking-tight">ПАСС</h1>
          <Badge variant="secondary">Зал</Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <ConnectionDot />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Сменить роль"
              onClick={() => setRole(null)}
              className="rounded-xl"
            >
              <ArrowLeftRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <TableBar />
        <PeriodToggle />
        <SearchField />
        <CategoryChips />
      </header>

      {/* сетка меню: нижний отступ, чтобы фиксированный sheet не перекрывал карточки */}
      <main className="px-4 pb-[120px] pt-3">
        <MenuGrid />
      </main>

      <CheckSheet />
    </div>
  )
}
