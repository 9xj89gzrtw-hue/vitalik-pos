/* ============================================================
   ВИТАЛИК — общие типы (официант ⇄ кухня/раздача ⇄ монитор)
   ============================================================ */

/** Активный экран (нижняя навигация, доступна всем в 1 тап) */
export type Screen = 'waiter' | 'kitchen' | 'analytics'

export type Period = 'breakfast' | 'lunch'

export type Station = 'breakfast' | 'cold' | 'hot_appetizer' | 'hot_main' | 'pastry'

export type CoursePriority = 1 | 2 | 3 | 4

/** Статус блюда: в очереди → готовится → на раздаче */
export type ItemStatus = 'queued' | 'cooking' | 'ready'

/**
 * 5-стадийный трекинг заказа «Анти-паника»:
 *   sent    🟡 ОТПРАВЛЕН — ждёт подтверждения кухни
 *   cooking 🔵→🟠 ПРИНЯТ ШЕФОМ / ГОТОВИТСЯ (acceptedAt фиксирует приём)
 *   ready   🟢 НА РАЗДАЧЕ — зовут раннера
 *   served  ⚪ ОТДАНО В ЗАЛ — в архив стола и аналитику
 */
export type OrderStatus = 'sent' | 'cooking' | 'ready' | 'served'

export type KitchenMode = 'tickets' | 'stoplist' | 'batch'

export type WaiterTab = 'menu' | 'orders'

export type StatusFilter = 'mine' | 'all'

export type ConnectionState = 'connecting' | 'online' | 'offline'

/* ---------- статичное меню ---------- */

export interface MenuItem {
  id: string
  name: string
  description?: string
  /** Время приготовления, напр. "8 мин" */
  time: string
  station: Station
  coursePriority: CoursePriority
  category: string
  period: Period
  isGarnish?: boolean
}

export interface TableInfo {
  id: string
  /** «Стол 7» / «Банкет 1» */
  label: string
  /** «7» / «Б1» — для компактных чипов */
  short: string
  banquet: boolean
}

/* ---------- черновик чека официанта (до отправки) ---------- */

export interface DraftItem {
  /** Уникальный ключ строки: `menuItemId::garnishId::standalone` */
  key: string
  menuItemId: string
  /** Привязанный гарнир (sd1…sd3) */
  garnishId?: string
  name: string
  qty: number
  comment?: string
  /** Гарнир, заказанный как отдельное блюдо */
  standalone?: boolean
}

export interface TableDraft {
  items: DraftItem[]
  /** ⭐ ВИП / ЗАКАЗЧИК — приоритет на кухне */
  vip: boolean
  /** Комментарий к столу («Отдать строго после тоста») */
  tableNote: string
}

/* ---------- отправленный заказ ---------- */

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  name: string
  qty: number
  comment: string | null
  station: Station
  coursePriority: number
  category: string
  status: ItemStatus
  tableId: string
  garnishId: string | null
  garnishName: string | null
  standalone: boolean
  isAddendum: boolean
}

export interface Order {
  id: string
  tableId: string
  tableLabel: string
  waiterName: string
  isVIP: boolean
  tableNote: string | null
  status: OrderStatus
  period: Period
  sentAt: number
  acceptedAt: number | null
  readyAt: number | null
  servedAt: number | null
  addendumCount: number
  items: OrderItem[]
}

export interface Analytics {
  date: string
  /** сколько порций каждого блюда ЗАКАЗАНО за сегодня (включая гарниры к блюдам) */
  orderedDishes: number
  /** отдано чеков за сегодня */
  servedOrders: number
  /** уникальных столов с отданными чеками */
  servedTables: number
  vipOrders: number
  items: { menuItemId: string; name: string; qty: number }[]
}

/* ---------- стоп-лист и остатки ---------- */

export interface StopControl {
  /** блюдо в стоп-листе — тапы официанта заблокированы */
  stopped: boolean
  /** лимит остатка (null = без лимита); при 0 блюдо автоматически в стопе */
  remaining: number | null
}

export type StopList = Record<string, StopControl>

/* ---------- протокол socket ---------- */

export interface SubmitItemPayload {
  menuItemId: string
  qty: number
  comment?: string
  garnishId?: string
  standalone?: boolean
}

export interface SubmitPayload {
  clientOrderId: string
  tableId: string
  waiterName: string
  isVIP: boolean
  tableNote?: string
  period: Period
  items: SubmitItemPayload[]
}

export interface SubmitAck {
  ok: boolean
  orderId?: string
  isAddendum?: boolean
  duplicate?: boolean
  error?: string
}

/** Заказ, ждущий восстановления связи (офлайн-очередь) */
export interface OutboxEntry extends SubmitPayload {
  queuedAt: number
  tableLabel: string
  pieces: number
}

export interface StatePayload {
  orders: Order[]
  analytics: Analytics
  stopList: StopList
}

/** Изменение стоп-листа/остатка блюда (уведомление залу) */
export interface StoplistNotification {
  menuItemId: string
  name: string
  stopped: boolean
  remaining: number | null
}

export interface OrderBrief {
  orderId: string
  tableId: string
  tableLabel: string
  waiterName: string
  isVIP: boolean
  pieces: number
  addendumCount: number
  sentAt: number
  isAddendum?: boolean
}

export interface AckResult {
  ok: boolean
  error?: string
}
