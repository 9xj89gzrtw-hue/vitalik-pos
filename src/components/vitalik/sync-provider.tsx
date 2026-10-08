'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { SyncState } from '@/lib/types'

type SyncContextValue = {
  state: SyncState | null
  online: boolean
  /** немедленный переснапшот (после мутаций) */
  refresh: () => void
  /** оптимистичный патч локального состояния */
  patch: (fn: (s: SyncState) => SyncState) => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

const POLL_MS = 1500
const RETRY_MS = 1000

/**
 * Надёжная синхронизация: лёгкий GET /api/sync каждые 1.5с.
 * Обрыв 4G → тихий повтор через 1с. Никаких блокирующих экранов «Ждёт связи».
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SyncState | null>(null)
  const [online, setOnline] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const alive = useRef(true)

  const tick = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/sync', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as SyncState
      if (!alive.current) return
      setState(data)
      setOnline(true)
      timer.current = setTimeout(() => {
        void tick()
      }, POLL_MS)
    } catch {
      if (!alive.current) return
      setOnline(false)
      timer.current = setTimeout(() => {
        void tick()
      }, RETRY_MS)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void tick()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer.current) clearTimeout(timer.current)
        void tick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tick])

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    void tick()
  }, [tick])

  const patch = useCallback((fn: (s: SyncState) => SyncState) => {
    setState((s) => (s ? fn(s) : s))
  }, [])

  return (
    <SyncContext.Provider value={{ state, online, refresh, patch }}>{children}</SyncContext.Provider>
  )
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync должен использоваться внутри SyncProvider')
  return ctx
}
