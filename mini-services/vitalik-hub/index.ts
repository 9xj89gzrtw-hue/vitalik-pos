import { Server } from 'socket.io'
import {
  acceptOrder,
  loadState,
  readyOrder,
  resetShift,
  serveOrder,
  submitOrder,
  tableLabel,
  toggleItem,
  type ApiOrder,
  type SubmitInput,
} from './db'

/* ============================================================
   ВИТАЛИК — realtime-хаб (socket.io, порт 3003).
   Протокол (все мутации с ack-подтверждением):
     client → server:
       vk:order:submit  { clientOrderId, tableId, waiterName, isVIP, tableNote, period, items }
       vk:order:accept  { orderId }        — ПРИНЯТЬ В РАБОТУ
       vk:order:ready   { orderId }        — ГОТОВО! всё на раздаче
       vk:order:serve   { orderId }        — ОТДАНО РАННЕРУ
       vk:item:toggle   { itemId }         — тап по блюду (cooking ↔ ready)
       vk:shift:reset   { pin }            — утренний сброс (пин 0000)
       vk:state:fetch                       — прислать состояние только мне
     server → client:
       vk:state          { orders, analytics }  — на подключение и после мутаций
       vk:notify:new-order / accepted / ready / served / reset
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
  io.emit('vk:state', loadState())
}

function orderBrief(o: ApiOrder) {
  return {
    orderId: o.id,
    tableId: o.tableId,
    tableLabel: o.tableLabel,
    waiterName: o.waiterName,
    isVIP: o.isVIP,
    pieces: o.items.reduce((acc, i) => acc + i.qty, 0),
    addendumCount: o.addendumCount,
    sentAt: o.sentAt,
  }
}

io.on('connection', (socket) => {
  // актуальный снимок новичку
  socket.emit('vk:state', loadState())
  console.log(`[vitalik] connect ${socket.id}`)

  socket.on('vk:state:fetch', () => {
    socket.emit('vk:state', loadState())
  })

  socket.on('vk:order:submit', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const input = payload as SubmitInput
      const result = submitOrder(input)
      const { order, isAddendum, duplicate } = result
      console.log(
        `[vitalik] order ${order.id} → ${tableLabel(order.tableId)} (${order.items.length} позиц., ${isAddendum ? 'дозаказ' : 'новый'}${order.isVIP ? ', ВИП' : ''})`,
      )
      ack?.({ ok: true, orderId: order.id, isAddendum, duplicate })
      if (!duplicate) {
        broadcastState()
        io.emit('vk:notify:new-order', { ...orderBrief(order), isAddendum })
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Ошибка создания заказа'
      console.warn(`[vitalik] order:submit rejected: ${error}`)
      ack?.({ ok: false, error })
    }
  })

  socket.on('vk:order:accept', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { orderId?: unknown }
      const order = acceptOrder(p.orderId)
      if (!order) {
        ack?.({ ok: false, error: 'Заказ не найден или уже принят' })
        return
      }
      console.log(`[vitalik] принят в работу: ${order.tableLabel}`)
      ack?.({ ok: true })
      broadcastState()
      io.emit('vk:notify:accepted', orderBrief(order))
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : 'Ошибка' })
    }
  })

  socket.on('vk:order:ready', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { orderId?: unknown }
      const order = readyOrder(p.orderId)
      if (!order) {
        ack?.({ ok: false, error: 'Заказ не найден или уже на раздаче' })
        return
      }
      console.log(`[vitalik] готово на раздаче: ${order.tableLabel}`)
      ack?.({ ok: true })
      broadcastState()
      io.emit('vk:notify:ready', orderBrief(order))
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : 'Ошибка' })
    }
  })

  socket.on('vk:order:serve', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { orderId?: unknown }
      const order = serveOrder(p.orderId)
      if (!order) {
        ack?.({ ok: false, error: 'Заказ не найден или не на раздаче' })
        return
      }
      console.log(`[vitalik] отдано раннеру: ${order.tableLabel}`)
      ack?.({ ok: true })
      broadcastState()
      io.emit('vk:notify:served', orderBrief(order))
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : 'Ошибка' })
    }
  })

  socket.on('vk:item:toggle', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { itemId?: unknown }
      const result = toggleItem(p.itemId)
      if (!result.ok) {
        ack?.({ ok: false, error: result.error })
        return
      }
      ack?.({ ok: true })
      broadcastState()
      if (result.becameReady && result.order) {
        io.emit('vk:notify:ready', orderBrief(result.order))
      }
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : 'Ошибка' })
    }
  })

  socket.on('vk:shift:reset', (payload: unknown, ack?: (res: unknown) => void) => {
    try {
      const p = (payload ?? {}) as { pin?: unknown }
      const ok = resetShift(p.pin)
      if (!ok) {
        ack?.({ ok: false, error: 'Неверный пин-код' })
        return
      }
      console.log('[vitalik] смена сброшена (пин 0000)')
      ack?.({ ok: true })
      broadcastState()
      io.emit('vk:notify:reset', {})
    } catch (e) {
      ack?.({ ok: false, error: e instanceof Error ? e.message : 'Ошибка' })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`[vitalik] disconnect ${socket.id} (${reason})`)
  })
})

console.log(`[vitalik-hub] listening on :${PORT}`)
