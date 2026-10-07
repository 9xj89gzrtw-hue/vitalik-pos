'use client'

import { useEffect } from 'react'
import { usePosStore } from '@/lib/store'
import { KitchenHeader } from './kitchen/kitchen-header'
import { BatchBoard } from './kitchen/batch-board'
import { TicketsBoard } from './kitchen/tickets-board'
import { KitchenFooter } from './kitchen/kitchen-footer'

/**
 * Экран кухни (KDS) — тёмная тема через класс .dark на корне,
 * app-like каркас: шапка / прокручиваемая доска / футер.
 */
export function KitchenView() {
  const kitchenMode = usePosStore((s) => s.kitchenMode)

  // PWA: строка состояния браузера под тёмную тему кухни
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', '#26211A')
    return () => {
      meta?.setAttribute('content', '#FAF8F5')
    }
  }, [])

  return (
    <div className="dark h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <KitchenHeader />
      {kitchenMode === 'batch' ? <BatchBoard /> : <TicketsBoard />}
      <KitchenFooter />
    </div>
  )
}
