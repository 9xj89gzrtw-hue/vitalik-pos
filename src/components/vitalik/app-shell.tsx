'use client'

import { useEffect } from 'react'
import { BellRing } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { initHubSocket } from '@/lib/socket'
import { installAudioUnlock } from '@/lib/audio'
import { BottomNav } from './bottom-nav'
import { WaiterScreen } from './waiter/waiter-screen'
import { KitchenScreen } from './kitchen/kitchen-screen'
import { MonitorScreen } from './monitor/monitor-screen'

/* ============================================================
   ВИТАЛИК — оболочка приложения: гидрация, socket, экраны.
   ============================================================ */

export function AppShell() {
  const hydrated = useAppStore((s) => s.hydrated)
  const screen = useAppStore((s) => s.screen)

  useEffect(() => {
    installAudioUnlock()
    useAppStore.getState().hydrate()
    initHubSocket()
  }, [])

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0F1115]">
        <div className="flex flex-col items-center gap-3">
          <span className="relative grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/15">
            <BellRing className="h-8 w-8 animate-pulse text-emerald-400" />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight text-zinc-100">ВИТАЛИК</span>
          <span className="text-xs text-zinc-500">Загрузка смены…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0F1115] text-zinc-100 antialiased">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
        {screen === 'waiter' && <WaiterScreen />}
        {screen === 'kitchen' && <KitchenScreen />}
        {screen === 'monitor' && <MonitorScreen />}
      </div>
      <BottomNav />
    </div>
  )
}
