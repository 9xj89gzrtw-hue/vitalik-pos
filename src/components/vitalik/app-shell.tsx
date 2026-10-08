'use client'

import { useEffect } from 'react'
import { BellRing } from 'lucide-react'
import { VitalikProvider } from '@/lib/api-client'
import { installAudioUnlock } from '@/lib/audio'
import { UiProvider, useUi } from './ui'
import { WaiterScreen } from './waiter/waiter-screen'
import { KitchenScreen } from './kitchen/kitchen-screen'
import { AnalyticsScreen } from './analytics/analytics-screen'
import { BottomNav } from './bottom-nav'

/* ============================================================
   ВИТАЛИК v6 — оболочка приложения: серверный поллинг, экраны.
   ============================================================ */

export function AppShell() {
  useEffect(() => {
    installAudioUnlock()
  }, [])

  return (
    <VitalikProvider>
      <UiProvider>
        <Screens />
        <BottomNav />
      </UiProvider>
    </VitalikProvider>
  )
}

function Screens() {
  const { screen } = useUi()

  return (
    <div className="min-h-dvh bg-[#0D0F12] text-[#F5F1E8] antialiased">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-3">
        <main className="flex-1">
          {screen === 'waiter' && <WaiterScreen />}
          {screen === 'kitchen' && <KitchenScreen />}
          {screen === 'analytics' && <AnalyticsScreen />}
        </main>
      </div>
    </div>
  )
}

/** Сплэш до первого снимка состояния */
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0D0F12]">
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid h-16 w-16 place-items-center rounded-3xl bg-[#D4AF37]/15">
          <BellRing className="h-8 w-8 animate-pulse text-[#D4AF37]" />
        </span>
        <span className="font-logo text-2xl font-extrabold tracking-tight text-[#F5F1E8]">ВИТАЛИК</span>
        <span className="text-xs text-zinc-500">Загрузка смены…</span>
      </div>
    </div>
  )
}
