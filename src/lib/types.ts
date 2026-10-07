/* ============================================================
   Пасс — ресторанная POS: общие типы (зал ⇄ кухня)
   ============================================================ */

export type Role = 'waiter' | 'kitchen'

export type Period = 'breakfast' | 'lunch'

export type Station = 'breakfast' | 'cold' | 'hot_appetizer' | 'hot_main' | 'pastry'

export type CoursePriority = 1 | 2 | 3 | 4

export type ItemStatus = 'new' | 'cooking' | 'done'

export type OrderStatus = 'active' | 'archived'

export type KitchenMode = 'batch' | 'tickets'

export type ConnectionState = 'connecting' | 'online' | 'offline'

/** Позиция меню (статичные данные) */
export interface MenuItem {
  id: string
  name: string
  description?: string
  /** Время приготовления, напр. "8 мин" */
  time: string
  station: Station
  coursePriority: CoursePriority
  /** Категория как в меню, напр. "САЛАТЫ" */
  category: string
  period: Period
}

/** Позиция черновика (чек официанта, ещё не отправлен) */
export interface CheckItem {
  menuItemId: string
  name: string
  qty: number
  comment?: string
}

/** Позиция отправленного заказа (на кухне) */
export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  name: string
  qty: number
  comment: string | null
  station: Station
  coursePriority: CoursePriority
  /** категория меню («САЛАТЫ»…) — для заголовков курсов на доске */
  category: string
  status: ItemStatus
  tableNumber: number
}

export interface Order {
  id: string
  tableNumber: number
  period: Period
  status: OrderStatus
  /** epoch ms */
  createdAt: number
  items: OrderItem[]
}

/* ---------- Payload-ы socket-протокола ---------- */

export interface CreateOrderPayload {
  tableNumber: number
  period: Period
  items: CheckItem[]
}

export interface AckOk {
  ok: boolean
  error?: string
  order?: Order
}

export interface StatePayload {
  orders: Order[]
}
