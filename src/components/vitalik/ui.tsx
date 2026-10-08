'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { usePersistedState } from '@/lib/api-client'
import { defaultPeriod } from '@/lib/menu'
import type { Period, Screen, WaiterName } from '@/lib/types'

/* ============================================================
   ВИТАЛИК v6 — UI-контекст: активный экран, официант, стол,
   смена меню (пersist в памяти телефона, vitalik_pos_*).
   ============================================================ */

interface UiValue {
  screen: Screen
  setScreen: (s: Screen) => void
  waiter: WaiterName | null
  setWaiter: (w: WaiterName | null) => void
  table: number | null
  setTable: (t: number | null) => void
  period: Period
  setPeriod: (p: Period) => void
}

const UiContext = createContext<UiValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = usePersistedState<Screen>('vitalik_pos_screen', 'waiter')
  const [waiter, setWaiter] = usePersistedState<WaiterName | null>('vitalik_pos_waiter', null)
  const [table, setTable] = usePersistedState<number | null>('vitalik_pos_table', null)
  const [period, setPeriod] = usePersistedState<Period>('vitalik_pos_period', 'lunch')

  // смена по умолчанию — по времени (10:00–12:00 → завтрак), SSR-безопасно
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('vitalik_pos_period')
      if (raw == null) setPeriod(defaultPeriod())
    } catch {
      /* no-op */
    }
  }, [])

  return (
    <UiContext.Provider
      value={{ screen, setScreen, waiter, setWaiter, table, setTable, period, setPeriod }}
    >
      {children}
    </UiContext.Provider>
  )
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi должен использоваться внутри <UiProvider>')
  return ctx
}
