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
import { TableOrders } from './waiter/table-orders'
import { WaiterTabs } from './waiter/waiter-tabs'

/** Экран официанта: вкладки «Новый заказ» / «Заказы стола», столы, чек → кухня */
export function WaiterView() {
  const setRole = usePosStore((s) => s.setRole)
  const waiterTab = usePosStore((s) => s.waiterTab)

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

        {/* Ряд 2: вкладки «Новый заказ / Заказы стола» */}
        <WaiterTabs />

        {/* Ряд 3: выбор стола (в обеих вкладках) */}
        <TableBar />

        {/* Фильтры меню — только во вкладке «Новый заказ» */}
        {waiterTab === 'menu' ? (
          <>
            <PeriodToggle />
            <SearchField />
            <CategoryChips />
          </>
        ) : null}
      </header>

      {/* нижний отступ: под фиксированный sheet (menu) / панель действий (orders) */}
      <main
        id={`waiter-panel-${waiterTab}`}
        role="tabpanel"
        aria-labelledby={`waiter-tab-${waiterTab}`}
        className="px-4 pb-[120px] pt-3"
      >
        {waiterTab === 'menu' ? <MenuGrid /> : <TableOrders />}
      </main>

      {waiterTab === 'menu' ? <CheckSheet /> : null}
    </div>
  )
}
