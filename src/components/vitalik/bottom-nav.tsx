'use client'

import { ConciergeBell, ChefHat, LayoutGrid } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { activeOrders } from '@/lib/derive'
import type { Screen } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ============================================================
   Нижняя панель навигации — доступна всем в 1 тап:
   🛎 Официант | 👨‍🍳 Кухня / Раздача | 📊 Монитор зала
   ============================================================ */

const TABS: { key: Screen; icon: typeof ConciergeBell; label: string }[] = [
  { key: 'waiter', icon: ConciergeBell, label: 'Официант' },
  { key: 'kitchen', icon: ChefHat, label: 'Кухня / Раздача' },
  { key: 'monitor', icon: LayoutGrid, label: 'Монитор зала' },
]

export function BottomNav() {
  const screen = useAppStore((s) => s.screen)
  const setScreen = useAppStore((s) => s.setScreen)
  const orders = useAppStore((s) => s.orders)
  const waiterName = useAppStore((s) => s.waiterName)

  const active = activeOrders(orders)

  // бейдж официанта: мои столы, ожидающие выноса с раздачи
  const myReady = active.filter(
    (o) => o.status === 'ready' && (!waiterName || o.waiterName === waiterName),
  ).length
  // бейдж кухни: заказы, ждущие приёмки шефом
  const unaccepted = active.filter((o) => o.status === 'sent').length

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0C0E12]/95 backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const isActive = screen === tab.key
          const Icon = tab.icon
          const badge =
            tab.key === 'waiter' ? myReady : tab.key === 'kitchen' ? unaccepted : 0
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScreen(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex h-[68px] flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300',
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-[3px] w-10 rounded-full bg-emerald-400" aria-hidden />
              )}
              <span className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
                {badge > 0 && (
                  <span
                    className={cn(
                      'absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-black',
                      tab.key === 'waiter' ? 'bg-emerald-500 text-black' : 'bg-yellow-400 text-black',
                    )}
                    aria-label={`${badge}`}
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-bold leading-none">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
