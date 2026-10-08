'use client'

import { useEffect, useState } from 'react'
import { SyncProvider, useSync } from './sync-provider'
import { WaiterScreen } from './waiter-screen'
import { KitchenScreen } from './kitchen-screen'
import { SummaryScreen } from './summary-screen'
import { useVitalik } from '@/lib/store'

type Screen = 'waiter' | 'kitchen' | 'summary'

const TABS: { id: Screen; icon: string; label: string }[] = [
  { id: 'waiter', icon: '🛎', label: 'Официант' },
  { id: 'kitchen', icon: '👨‍🍳', label: 'Кухня' },
  { id: 'summary', icon: '📊', label: 'Сводка' },
]

export function AppShell() {
  return (
    <SyncProvider>
      <Shell />
    </SyncProvider>
  )
}

function Shell() {
  const [screen, setScreen] = useState<Screen>('waiter')
  const { online } = useSync()
  const hydrate = useVitalik((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <div className="flex min-h-screen flex-col bg-[#12141A] text-white">
      <h1 className="sr-only">ВИТАЛИК — POS зала и кухни</h1>
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b border-[#262B35]/70 bg-[#12141A]/90 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-xl items-center justify-between px-4">
          <div className="flex items-baseline gap-2">
            <span className="font-logo text-lg font-bold tracking-[0.18em] text-white">ВИТАЛИК</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]">
              pos
            </span>
          </div>
          {/* Индикатор связи: крошечный и ненавязчивый, ничего не блокирует */}
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                online ? 'bg-emerald-400' : 'animate-pulse bg-red-400'
              }`}
            />
            {online ? 'онлайн' : 'нет сети'}
          </span>
        </div>
      </header>

      {/* Контент */}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-40 pt-4">
        {screen === 'waiter' && <WaiterScreen />}
        {screen === 'kitchen' && <KitchenScreen />}
        {screen === 'summary' && <SummaryScreen />}
      </main>

      {/* Нижняя навигация (футер прижат к низу) */}
      <nav
        aria-label="Разделы"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#262B35]/80 bg-[#16181F]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-xl grid-cols-3">
          {TABS.map((t) => {
            const active = screen === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setScreen(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-emerald-400" />
                )}
                <span className="text-xl leading-none" aria-hidden="true">
                  {t.icon}
                </span>
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
