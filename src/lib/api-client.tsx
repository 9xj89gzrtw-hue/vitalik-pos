'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { AppState } from './types'

/* ============================================================
   ВИТАЛИК v6 — клиентский sync-слой поверх HTTP:
   • GET /api/sync каждые 1500 мс (Fast HTTP Polling)
   • мигнул 4G → тихий повтор через 1000 мс, БЕЗ блокирующих
     экранов и надписей «Ждёт связи»
   • мутации POST /api/orders | /api/stoplist | /api/reset
     с reqId-идемпотентностью и авто-повтором при обрыве сети
   ============================================================ */

const POLL_MS = 1500
const RETRY_MS = 1000
const MUTATION_RETRIES = 6

export type MutatePath = '/api/orders' | '/api/stoplist' | '/api/reset'

interface MutateResult {
  ok: true
  [key: string]: unknown
}

interface VitalikContextValue {
  state: AppState | null
  /** true — последний poll прошёл; false — тихий ретрай (никаких блокирующих экранов) */
  synced: boolean
  mutate: (path: MutatePath, body: Record<string, unknown>) => Promise<MutateResult | null>
}

const VitalikContext = createContext<VitalikContextValue | null>(null)

function newReqId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

interface MutationResponse {
  ok?: boolean
  error?: string
  state?: AppState
}

export function VitalikProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [synced, setSynced] = useState(true)
  const alive = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef<AppState | null>(null)

  const apply = useCallback((next: AppState) => {
    stateRef.current = next
    setState(next)
  }, [])

  /* --- поллинг: setTimeout-цепочка, никаких наложенных запросов --- */
  useEffect(() => {
    alive.current = true

    const poll = async () => {
      if (!alive.current) return
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as AppState
        if (!alive.current) return
        apply(data)
        setSynced(true)
        timer.current = setTimeout(poll, POLL_MS)
      } catch {
        if (!alive.current) return
        // сеть мигнула — тихий повтор через 1 секунду
        setSynced(false)
        timer.current = setTimeout(poll, RETRY_MS)
      }
    }

    void poll()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer.current) clearTimeout(timer.current)
        void poll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [apply])

  /* --- мутации: быстрый провал по валидации, авто-повтор по сети --- */
  const mutate = useCallback(
    async (path: MutatePath, body: Record<string, unknown>): Promise<MutateResult | null> => {
      const payload = { ...body, reqId: newReqId() }

      const send = async (): Promise<MutateResult> => {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        let data: MutationResponse | null = null
        try {
          data = (await res.json()) as MutationResponse
        } catch {
          data = null
        }
        if (data && data.ok === false) {
          // сервер отклонил действие (валидация) — не повторяем
          const err = new Error(data.error || 'Действие отклонено') as Error & { fatal: boolean }
          err.fatal = true
          throw err
        }
        if (!res.ok || !data || !data.state) throw new Error('network')
        apply(data.state)
        setSynced(true)
        return data as MutateResult
      }

      for (let attempt = 0; ; attempt++) {
        try {
          return await send()
        } catch (e) {
          const err = e as Error & { fatal?: boolean }
          if (err.fatal) {
            toast.error(err.message || 'Действие отклонено')
            return null
          }
          if (attempt >= MUTATION_RETRIES) {
            toast.error('Нет связи — действие не выполнено. Попробуйте ещё раз')
            return null
          }
          await new Promise((r) => setTimeout(r, RETRY_MS))
        }
      }
    },
    [apply],
  )

  return (
    <VitalikContext.Provider value={{ state, synced, mutate }}>
      {children}
    </VitalikContext.Provider>
  )
}

export function useVitalik(): VitalikContextValue {
  const ctx = useContext(VitalikContext)
  if (!ctx) throw new Error('useVitalik должен использоваться внутри <VitalikProvider>')
  return ctx
}

/* ---------- localStorage-состояние (выбор официанта, стола и т.п.) ---------- */

export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial)
  const loaded = useRef(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) {
        // одноразовая синхронизация с внешним хранилищем — ожидаемый
        // каскадный рендер гидратации
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(JSON.parse(raw) as T)
      }
    } catch {
      /* no-op */
    }
    loaded.current = true
  }, [key])

  const set = useCallback(
    (v: T) => {
      setValue(v)
      if (loaded.current) {
        try {
          window.localStorage.setItem(key, JSON.stringify(v))
        } catch {
          /* no-op */
        }
      }
    },
    [key],
  )

  return [value, set]
}
