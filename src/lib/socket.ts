import { io, type Socket } from 'socket.io-client'
import type { AckResult, StatePayload } from './types'
import { useAppStore } from './store'

/* ============================================================
   Socket-транспорт к vitalik-hub (порт 3003).
   Паттерн подключения обязателен: относительный путь + XTransformPort
   (так Caddy-gateway проксирует запрос на нужный порт).
   ============================================================ */

export const HUB_PORT = 3003

let socket: Socket | null = null

export function initHubSocket(): Socket {
  if (socket) return socket
  const s = io(`/?XTransformPort=${HUB_PORT}`, {
    // DO NOT change the path, it is used by Caddy to forward the request to the correct port
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 700,
    reconnectionDelayMax: 4000,
    timeout: 7000,
  })
  socket = s

  const store = () => useAppStore.getState()

  s.on('connect', () => {
    store().setConnection('online')
    // офлайн-очередь заказов уходит на кухню сразу после восстановления связи
    void store().flushOutbox()
  })
  s.on('disconnect', () => store().setConnection('offline'))
  s.on('connect_error', () => {
    if (useAppStore.getState().connection !== 'offline') store().setConnection('offline')
  })

  s.on('vk:state', (payload: StatePayload) => {
    store().ingestState(payload)
  })

  s.on('vk:notify:new-order', (n) => store().onNewOrder(n))
  s.on('vk:notify:accepted', (n) => store().onAccepted(n))
  s.on('vk:notify:ready', (n) => store().onReady(n))
  s.on('vk:notify:served', (n) => store().onServed(n))
  s.on('vk:notify:reset', () => store().onReset())

  return s
}

export function getHubSocket(): Socket | null {
  return socket
}

/** emit с ack-подтверждением и таймаутом */
export function emitAck<T = AckResult>(event: string, payload: unknown, timeoutMs = 6000): Promise<T> {
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
