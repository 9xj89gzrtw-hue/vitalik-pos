/** Позиция заказа: блюдо + количество (+ гарнир для горячих блюд) */
export type OrderItem = {
  dish: string
  qty: number
  garnish?: string
}

/** Заказ стола (снапшот с сервера) */
export type OrderView = {
  id: string
  table: number
  waiter: string
  vip: boolean
  status: 'pending' | 'ready'
  items: OrderItem[]
  comment: string | null
  createdAt: number
  readyAt: number | null
}

/** Полный снапшот состояния (ответ GET /api/sync) */
export type SyncState = {
  serverTime: number
  orders: OrderView[]
  counters: { dish: string; qty: number }[]
  stopped: string[]
  stats: { totalOrders: number; totalPortions: number }
}
