/* ============================================================
   ВИТАЛИК v6 — общие типы (официант ⇄ кухня/раздача ⇄ аналитика)
   Архитектура: серверный in-memory стор + HTTP-поллинг 1.5 с.
   Никаких сокетов, никаких экранов «Ждёт связи».
   ============================================================ */

/** Экран нижней навигации (1 тап) */
export type Screen = 'waiter' | 'kitchen' | 'analytics'

/** Смена меню: завтрак 10:00–12:00 / обед 12:00–18:00 */
export type Period = 'breakfast' | 'lunch'

/** Ровно 3 повара (цеха) */
export type CookId = 1 | 2 | 3

/** Режимы экрана кухни */
export type KitchenMode = 'batch' | 'tickets' | 'stoplist'

/** Вкладки экрана официанта */
export type WaiterTab = 'menu' | 'status'

/** Официанты — ровно трое */
export type WaiterName = 'Саша' | 'Денис' | 'Вова'

/* ---------- статичное меню ---------- */

export interface MenuItem {
  id: string
  name: string
  /** Короткое имя для плотных списков (батчинг, баннеры, история) */
  short: string
  description?: string
  category: string
  period: Period
  /** Закреплённый повар (цех) */
  cook: CookId
  /** К блюду можно привязать гарнир (горячие закуски и горячие блюда) */
  garnishAttachable: boolean
  isGarnish?: boolean
}

export interface CookInfo {
  id: CookId
  title: string
  station: string
}

/* ---------- заказы (сервер — источник истины) ---------- */

/**
 * Позиция заказа с порционными счётчиками:
 *   queued  = qty − announced   ⏳ ждёт озвучки повару
 *   cooking = announced − ready 🔥 озвучено, готовится
 *   ready   = ready − served    🟢 ГОТОВО НА РАЗДАЧЕ
 *   served  = served            ⚪ подано (отдано раннеру)
 * Инвариант: 0 ≤ served ≤ ready ≤ announced ≤ qty
 */
export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  qty: number
  comment: string | null
  /** menuItemId блюда, к которому привязан этот гарнир (для отображения) */
  garnishFor: string | null
  announced: number
  ready: number
  served: number
}

export interface Order {
  id: string
  /** 1…12 */
  table: number
  waiter: WaiterName
  vip: boolean
  /** Комментарий к заказу («Детям вперёд», «После тоста») */
  comment: string | null
  items: OrderItem[]
  createdAt: number
  updatedAt: number
  /** Шеф нажал «ПРИНЯТЬ» — зуммер замолкает */
  acknowledged: boolean
  /** Счётчик дозаказов для тикета */
  addendumCount: number
}

/** Закрытый чек (журнал аналитики) */
export interface ClosedCheck {
  orderId: string
  table: number
  waiter: WaiterName
  vip: boolean
  comment: string | null
  items: { menuItemId: string; name: string; qty: number }[]
  createdAt: number
  closedAt: number
}

/* ---------- стоп-лист и остатки ---------- */

export interface StopControl {
  /** Блюдо в стоп-листе — заказы заблокированы */
  stopped: boolean
  /** Лимит порций на смену (null = без лимита) */
  limit: number | null
  /** Осталось порций; при 0 — автоматический стоп */
  remaining: number | null
}

export type StopList = Record<string, StopControl>

/* ---------- полезные Payload-ы / ответ API ---------- */

export interface SubmitItemPayload {
  menuItemId: string
  qty: number
  comment?: string
  garnishId?: string | null
}

export interface SubmitPayload {
  action: 'create'
  table: number
  waiter: WaiterName
  vip?: boolean
  comment?: string | null
  items: SubmitItemPayload[]
  reqId: string
}

export type OrdersAction =
  | SubmitPayload
  | { action: 'acknowledge'; reqId: string }
  | { action: 'announce'; menuItemId: string; count?: number; reqId: string }
  | { action: 'ready'; menuItemId: string; count?: number; reqId: string }
  | { action: 'served'; table: number; reqId: string }

export type StoplistAction =
  | { action: 'setStopped'; menuItemId: string; stopped: boolean; reqId: string }
  | { action: 'setLimit'; menuItemId: string; limit: number | null; reqId: string }

/** Полное состояние, которое отдаёт /api/sync и каждая мутация */
export interface AppState {
  revision: number
  /** Открытые заказы (по одному на стол максимум) */
  orders: Order[]
  /** Закрытые чеки за смену (новые сверху) */
  history: ClosedCheck[]
  stoplist: StopList
  /** Приготовлено порций за сегодня (по каждому блюду) */
  counters: Record<string, number>
  /** Заказано порций за сегодня (для расчёта остатков) */
  ordered: Record<string, number>
  serverTime: number
}

export interface ApiOk {
  ok: true
  state: AppState
}

export interface ApiErr {
  ok: false
  error: string
}

/* ---------- производные счётчики позиции ---------- */

export const queuedOf = (it: OrderItem) => it.qty - it.announced
export const cookingOf = (it: OrderItem) => it.announced - it.ready
export const readyOf = (it: OrderItem) => it.ready - it.served
export const servedOf = (it: OrderItem) => it.served
