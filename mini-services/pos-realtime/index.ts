import { Server } from 'socket.io'
import { archiveTable, createOrder, loadActiveOrders, setItemsStatus } from './db'

/* ============================================================
   Пасс — realtime-сервис (socket.io, порт 3003).
   Протокол (ack-подтверждения):
     client → server: pos:order:create, pos:items:status, pos:order:archive
     server → client: pos:state { orders } (на подключение и после каждой мутации)
   ============================================================ */

const PORT = 3003

const io = new Server(PORT, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

function broadcastState() {
  io.emit('pos:state', { orders: loadActiveOrders() })
}

io.on('connection', (socket) => {
  // актуальный снимок новичку
  socket.emit('pos:state', { orders: loadActiveOrders() })
  console.log(`[pos] connect ${socket.id}`)

  socket.on('pos:order:create', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const order = createOrder(payload as never)
      console.log(
        `[pos] order ${order.id} → стол ${order.tableNumber} (${order.items.length} позиц.)`,
      )
      ack?.({ ok: true, order })
      broadcastState()
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Ошибка создания заказа'
      console.warn(`[pos] order:create rejected: ${error}`)
      ack?.({ ok: false, error })
    }
  })

  socket.on('pos:items:status', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { ids?: unknown; status?: unknown }
      const changed = setItemsStatus(p.ids, p.status)
      ack?.({ ok: true, changed })
      if (changed > 0) broadcastState()
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Ошибка обновления статуса'
      ack?.({ ok: false, error })
    }
  })

  socket.on('pos:order:archive', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { tableNumber?: unknown }
      const changed = archiveTable(p.tableNumber)
      ack?.({ ok: true, changed })
      if (changed > 0) {
        console.log(`[pos] стол ${p.tableNumber} полностью отдан (${changed} заказов)`)
        broadcastState()
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Ошибка архивации'
      ack?.({ ok: false, error })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`[pos] disconnect ${socket.id} (${reason})`)
  })
})

console.log(`[pos-realtime] listening on :${PORT}`)
