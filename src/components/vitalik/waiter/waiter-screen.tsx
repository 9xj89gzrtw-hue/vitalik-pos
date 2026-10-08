'use client'

import type { KeyboardEvent } from 'react'
import { useAppStore } from '@/lib/store'
import { activeOrders } from '@/lib/derive'
import { cn } from '@/lib/utils'
import { HeaderBar } from './header-bar'
import { MenuTab } from './menu-tab'
import { StatusTab } from './status-tab'

/* ============================================================
   Экран «Официант»: шапка (3 официанта, 12 столов, ВИП,
   комментарий) + вкладки [📝 Меню] | [📋 Статус стола].
   ============================================================ */

export function WaiterScreen() {
  const waiterTab = useAppStore((s) => s.waiterTab)
  const setWaiterTab = useAppStore((s) => s.setWaiterTab)
  const orders = useAppStore((s) => s.orders)
  const selectedTableId = useAppStore((s) => s.selectedTableId)

  const selectedOrder = activeOrders(orders ?? []).find((o) => o.tableId === selectedTableId)
  const tableHasReady =
    selectedOrder?.status === 'ready' ||
    (selectedOrder?.items.some((i) => i.status === 'ready') ?? false)

  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setWaiterTab(waiterTab === 'menu' ? 'orders' : 'menu')
  }

  return (
    <div className="flex flex-col gap-3">
      <HeaderBar />

      {/* Вкладки стола */}
      <div className="sticky top-0 z-30 -mx-4 bg-[#0D0F12]/95 px-4 py-2 backdrop-blur-xl">
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
          role="tablist"
          aria-label="Вкладки стола"
          onKeyDown={onTablistKeyDown}
        >
          <button
            id="waiter-tab-menu"
            type="button"
            role="tab"
            aria-selected={waiterTab === 'menu'}
            aria-controls="waiter-panel-menu"
            tabIndex={waiterTab === 'menu' ? 0 : -1}
            onClick={() => setWaiterTab('menu')}
            className={tabBtnClass(waiterTab === 'menu')}
          >
            <span aria-hidden>📝</span>
            <span>Меню</span>
          </button>
          <button
            id="waiter-tab-orders"
            type="button"
            role="tab"
            aria-selected={waiterTab === 'orders'}
            aria-controls="waiter-panel-orders"
            tabIndex={waiterTab === 'orders' ? 0 : -1}
            onClick={() => setWaiterTab('orders')}
            className={tabBtnClass(waiterTab === 'orders')}
          >
            <span aria-hidden>📋</span>
            <span>Статус стола</span>
            {tableHasReady && (
              <span
                className="ml-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                aria-label="есть готовые блюда"
              />
            )}
          </button>
        </div>
      </div>

      <main className="flex flex-col gap-3">
        {waiterTab === 'menu' ? (
          <div
            id="waiter-panel-menu"
            role="tabpanel"
            aria-labelledby="waiter-tab-menu"
            className="flex flex-col gap-3"
          >
            <MenuTab />
          </div>
        ) : (
          <div
            id="waiter-panel-orders"
            role="tabpanel"
            aria-labelledby="waiter-tab-orders"
            className="flex flex-col gap-3"
          >
            <StatusTab />
          </div>
        )}
      </main>
    </div>
  )
}

function tabBtnClass(active: boolean): string {
  return cn(
    'flex h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-[13.5px] font-extrabold transition-all active:scale-[0.98]',
    active
      ? 'bg-[#D4AF37] text-[#14100A] shadow-lg shadow-[#D4AF37]/20'
      : 'text-zinc-400',
  )
}
