import { io, type Socket } from 'socket.io-client'
import type { AckOk, StatePayload } from './types'
import { usePosStore } from './store'

/* ============================================================
   Socket-транспорт к mini-сервису «Пасс» (port 3003).
   Паттерн подключения обязателен: относительный путь + XTransformPort
   (так Caddy-gateway проксирует запрос на нужный порт).
   ============================================================ */

export const POS_SERVICE_PORT = 3003

let socket: Socket | null = null

export function initPosSocket(): Socket {
  if (socket) return socket
  const s = io(`/?XTransformPort=${POS_SERVICE_PORT}`, {
    // DO NOT change the path, it is used by Caddy to forward the request to the correct port
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    timeout: 7000,
  })
  socket = s

  const store = () => usePosStore.getState()

  s.on('connect', () => {
    // первый кадр состояния после (ре)коннекта — без звуковых эффектов
    store().markSyncBoundary()
    store().setConnection('online')
  })
  s.on('disconnect', () => store().setConnection('offline'))
  s.on('connect_error', () => {
    if (usePosStore.getState().connection !== 'offline') store().setConnection('offline')
  })
  s.on('pos:state', (payload: StatePayload) => {
    store().ingestState(payload?.orders ?? [])
  })

  return s
}

export function getPosSocket(): Socket | null {
  return socket
}

/** emit с ack-подтверждением и таймаутом */
export function emitAck<T = AckOk>(event: string, payload: unknown, timeoutMs = 6000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const s = socket
    if (!s || !s.connected) {
      reject(new Error('offline'))
      return
    }
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('timeout'))
      }
    }, timeoutMs)
    s.emit(event, payload, (res: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(res)
    })
  })
}
