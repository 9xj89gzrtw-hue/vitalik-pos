'use client'

import { useAppStore } from '@/lib/store'
import { activeOrders } from '@/lib/derive'
import { cn } from '@/lib/utils'
import { HeaderBar } from './header-bar'
import { MenuTab } from './menu-tab'
import { StatusTab } from './status-tab'

/* ============================================================
   Экран «Официант»: две вкладки —
   [ 📝 Меню и Корзина ] | [ 📍 Где мой заказ? (Статус столов) ]
   ============================================================ */

export function WaiterScreen() {
  const waiterTab = useAppStore((s) => s.waiterTab)
  const setWaiterTab = useAppStore((s) => s.setWaiterTab)
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)

  const myActive = activeOrders(orders).filter(
    (o) => !waiterName || o.waiterName === waiterName,
  ).length

  return (
    <div className="flex flex-col gap-3">
      <HeaderBar />

      {/* Вкладки экрана официанта */}
      <div className="sticky top-0 z-30 -mx-4 bg-[#0F1115]/95 px-4 py-2 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#161B23] p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={waiterTab === 'menu'}
            onClick={() => setWaiterTab('menu')}
            className={cn(
              'flex h-12 items-center justify-center gap-2 rounded-xl text-[13.5px] font-extrabold transition-all',
              waiterTab === 'menu'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-400',
            )}
          >
            <span className="text-base leading-none">📝</span>
            <span className="leading-none">Меню и Корзина</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={waiterTab === 'orders'}
            onClick={() => setWaiterTab('orders')}
            className={cn(
              'relative flex h-12 items-center justify-center gap-2 rounded-xl text-[13.5px] font-extrabold transition-all',
              waiterTab === 'orders'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-400',
            )}
          >
            <span className="text-base leading-none">📍</span>
            <span className="leading-none">Где мой заказ?</span>
            {myActive > 0 && (
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-black',
                  waiterTab === 'orders' ? 'bg-black/20 text-black' : 'bg-emerald-500 text-black',
                )}
              >
                {myActive}
              </span>
            )}
          </button>
        </div>
      </div>

      {waiterTab === 'menu' ? <MenuTab /> : <StatusTab />}
    </div>
  )
}
