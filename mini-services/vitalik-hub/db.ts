import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/* ============================================================
   ВИТАЛИК — хранилище (SQLite). Путь: <project>/db/vitalik.db

   5-стадийный трекинг заказов:
     sent → cooking (ПРИНЯТ ШЕФОМ, items: queued→cooking)
          → ready  (ГОТОВО! всё на раздаче, ждём раннера)
          → served (ОТДАНО РАННЕРУ — в архив/аналитику)
   ============================================================ */

const DB_PATH = join(import.meta.dir, '..', '..', 'db', 'vitalik.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH, { create: true })
db.exec('PRAGMA journal_mode = WAL;')
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    client_order_id TEXT UNIQUE,
    table_id        TEXT    NOT NULL,
    waiter_name     TEXT    NOT NULL,
    is_vip          INTEGER NOT NULL DEFAULT 0,
    table_note      TEXT,
    status          TEXT    NOT NULL DEFAULT 'sent',
    period          TEXT    NOT NULL DEFAULT 'lunch',
    sent_at         INTEGER NOT NULL,
    accepted_at     INTEGER,
    ready_at        INTEGER,
    served_at       INTEGER,
    served_day      TEXT,
    addendum_count  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id              TEXT PRIMARY KEY,
    order_id        TEXT    NOT NULL,
    menu_item_id    TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    qty             INTEGER NOT NULL,
    comment         TEXT,
    station         TEXT    NOT NULL,
    course_priority INTEGER NOT NULL,
    category        TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'queued',
    garnish_id      TEXT,
    garnish_name    TEXT,
    is_standalone   INTEGER NOT NULL DEFAULT 0,
    is_addendum     INTEGER NOT NULL DEFAULT 0,
    table_id        TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_served_day ON orders(served_day);
  CREATE INDEX IF NOT EXISTS idx_orders_table      ON orders(table_id);
  CREATE INDEX IF NOT EXISTS idx_items_order       ON order_items(order_id);
`)

/* ---------- серверная копия меню (синхронно с src/lib/menu.ts) ---------- */

export interface ServerMenuItem {
  name: string
  station: string
  coursePriority: number
  category: string
  isGarnish?: boolean
}

export const SERVER_MENU: Record<string, ServerMenuItem> = {
  b1: { name: 'Овсяная каша со свежими фруктами', station: 'breakfast', coursePriority: 1, category: 'Завтраки' },
  b2: { name: 'Мини-сырники с муссом, сметаной и Nutella', station: 'breakfast', coursePriority: 1, category: 'Завтраки' },
  b3: { name: 'Классический омлет с сыром и свежими овощами', station: 'breakfast', coursePriority: 1, category: 'Завтраки' },
  s1: { name: 'Ростбиф с листьями салата', station: 'cold', coursePriority: 1, category: 'САЛАТЫ' },
  s2: { name: 'Копченая свекла со страчателлой', station: 'cold', coursePriority: 1, category: 'САЛАТЫ' },
  s3: { name: 'Салат с гравлаксом из лосося', station: 'cold', coursePriority: 1, category: 'САЛАТЫ' },
  ha1: { name: 'Сибас в гремолате с цукини', station: 'hot_appetizer', coursePriority: 2, category: 'ГОРЯЧИЕ ЗАКУСКИ' },
  ha2: { name: 'Драники из батата с гуакамоле', station: 'hot_appetizer', coursePriority: 2, category: 'ГОРЯЧИЕ ЗАКУСКИ' },
  ha3: { name: 'Кокиль с телятиной', station: 'hot_appetizer', coursePriority: 2, category: 'ГОРЯЧИЕ ЗАКУСКИ' },
  m1: { name: 'Утиная грудка', station: 'hot_main', coursePriority: 3, category: 'ГОРЯЧИЕ БЛЮДА' },
  m2: { name: 'Брискет из говядины', station: 'hot_main', coursePriority: 3, category: 'ГОРЯЧИЕ БЛЮДА' },
  m3: { name: 'Креветки в катаифи', station: 'hot_main', coursePriority: 3, category: 'ГОРЯЧИЕ БЛЮДА' },
  sd1: { name: 'Картофель беби с розмарином', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ', isGarnish: true },
  sd2: { name: 'Овощное соте', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ', isGarnish: true },
  sd3: { name: 'Жасминовый рис припущенный', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ', isGarnish: true },
  d1: { name: 'Брауни с фундуком и Nutella', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
  d2: { name: 'Томленая слива со сливочным лабне', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
  d3: { name: 'Мини-чизкейк с ягодами', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
}

const GARNISH_IDS = new Set(['sd1', 'sd2', 'sd3'])
const ATTACHABLE_CATEGORIES = new Set(['ГОРЯЧИЕ ЗАКУСКИ', 'ГОРЯЧИЕ БЛЮДА'])

/* ---------- столы: 1–25 + Банкет 1/2 ---------- */

export const TABLE_IDS: ReadonlySet<string> = new Set(
  [
    ...Array.from({ length: 25 }, (_, i) => `t${i + 1}`),
    'banquet1',
    'banquet2',
  ],
)

export function tableLabel(tableId: string): string {
  if (tableId === 'banquet1') return 'Банкет 1'
  if (tableId === 'banquet2') return 'Банкет 2'
  const n = Number(tableId.replace(/^t/, ''))
  return Number.isInteger(n) ? `Стол ${n}` : tableId
}

/* ---------- типы ---------- */

interface OrderRow {
  id: string
  client_order_id: string | null
  table_id: string
  waiter_name: string
  is_vip: number
  table_note: string | null
  status: string
  period: string
  sent_at: number
  accepted_at: number | null
  ready_at: number | null
  served_at: number | null
  served_day: string | null
  addendum_count: number
}

interface ItemRow {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  qty: number
  comment: string | null
  station: string
  course_priority: number
  category: string
  status: string
  garnish_id: string | null
  garnish_name: string | null
  is_standalone: number
  is_addendum: number
  table_id: string
}

export interface ApiItem {
  id: string
  orderId: string
  menuItemId: string
  name: string
  qty: number
  comment: string | null
  station: string
  coursePriority: number
  category: string
  status: 'queued' | 'cooking' | 'ready'
  tableId: string
  garnishId: string | null
  garnishName: string | null
  standalone: boolean
  isAddendum: boolean
}

export interface ApiOrder {
  id: string
  tableId: string
  tableLabel: string
  waiterName: string
  isVIP: boolean
  tableNote: string | null
  status: 'sent' | 'cooking' | 'ready' | 'served'
  period: 'breakfast' | 'lunch'
  sentAt: number
  acceptedAt: number | null
  readyAt: number | null
  servedAt: number | null
  addendumCount: number
  items: ApiItem[]
}

export interface ApiAnalytics {
  date: string
  servedOrders: number
  servedTables: number
  totalDishes: number
  vipOrders: number
  items: { menuItemId: string; name: string; qty: number }[]
}

/* ---------- санитайзеры ---------- */

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const cleanStr = (v: unknown, maxLen: number): string =>
  typeof v === 'string' ? v.trim().slice(0, maxLen) : ''

const uid = (): string => crypto.randomUUID()

function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function mapItem(i: ItemRow): ApiItem {
  return {
    id: i.id,
    orderId: i.order_id,
    menuItemId: i.menu_item_id,
    name: i.name,
    qty: i.qty,
    comment: i.comment ?? null,
    station: i.station,
    coursePriority: i.course_priority,
    category: i.category,
    status: i.status as ApiItem['status'],
    tableId: i.table_id,
    garnishId: i.garnish_id ?? null,
    garnishName: i.garnish_name ?? null,
    standalone: i.is_standalone === 1,
    isAddendum: i.is_addendum === 1,
  }
}

function mapOrder(o: OrderRow, items: ApiItem[]): ApiOrder {
  return {
    id: o.id,
    tableId: o.table_id,
    tableLabel: tableLabel(o.table_id),
    waiterName: o.waiter_name,
    isVIP: o.is_vip === 1,
    tableNote: o.table_note ?? null,
    status: o.status as ApiOrder['status'],
    period: o.period === 'breakfast' ? 'breakfast' : 'lunch',
    sentAt: o.sent_at,
    acceptedAt: o.accepted_at ?? null,
    readyAt: o.ready_at ?? null,
    servedAt: o.served_at ?? null,
    addendumCount: o.addendum_count,
    items,
  }
}

const itemsByOrder = db.prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid ASC`)

function hydrate(o: OrderRow): ApiOrder {
  return mapOrder(o, (itemsByOrder.all(o.id) as ItemRow[]).map(mapItem))
}

/* ---------- загрузка состояния ---------- */

export function loadOrders(): ApiOrder[] {
  const active = db
    .prepare(`SELECT * FROM orders WHERE status != 'served' ORDER BY sent_at ASC`)
    .all() as OrderRow[]
  const today = dayKey(Date.now())
  const served = db
    .prepare(
      `SELECT * FROM orders WHERE status = 'served' AND served_day = ? ORDER BY served_at DESC LIMIT 60`,
    )
    .all(today) as OrderRow[]
  return [...active, ...served].map(hydrate)
}

export function loadAnalytics(): ApiAnalytics {
  const today = dayKey(Date.now())
  const served = db
    .prepare(`SELECT * FROM orders WHERE status = 'served' AND served_day = ?`)
    .all(today) as OrderRow[]
  const ids = served.map((o) => o.id)
  let totalDishes = 0
  const perItem = new Map<string, { menuItemId: string; name: string; qty: number }>()
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ')
    const rows = db
      .prepare(`SELECT menu_item_id, name, SUM(qty) AS qty FROM order_items WHERE order_id IN (${placeholders}) GROUP BY menu_item_id ORDER BY qty DESC`)
      .all(...ids) as { menu_item_id: string; name: string; qty: number }[]
    for (const r of rows) {
      totalDishes += Number(r.qty)
      perItem.set(r.menu_item_id, { menuItemId: r.menu_item_id, name: r.name, qty: Number(r.qty) })
    }
  }
  return {
    date: today,
    servedOrders: served.length,
    servedTables: new Set(served.map((o) => o.table_id)).size,
    totalDishes,
    vipOrders: served.filter((o) => o.is_vip === 1).length,
    items: [...perItem.values()].slice(0, 60),
  }
}

export function loadState(): { orders: ApiOrder[]; analytics: ApiAnalytics } {
  return { orders: loadOrders(), analytics: loadAnalytics() }
}

/* ---------- создание заказа / дозаказ ---------- */

export interface SubmitItem {
  menuItemId: string
  qty: number
  comment?: string
  garnishId?: string
  standalone?: boolean
}

export interface SubmitInput {
  clientOrderId?: string
  tableId: string
  waiterName: string
  isVIP?: boolean
  tableNote?: string
  period?: 'breakfast' | 'lunch'
  items: SubmitItem[]
}

export interface SubmitResult {
  order: ApiOrder
  isAddendum: boolean
  duplicate: boolean
}

export function submitOrder(input: SubmitInput): SubmitResult {
  const tableId = String(input?.tableId ?? '')
  if (!TABLE_IDS.has(tableId)) throw new Error('Некорректный стол')
  const waiterName = cleanStr(input?.waiterName, 40)
  if (!waiterName) throw new Error('Укажите имя официанта')
  if (!Array.isArray(input?.items) || input.items.length === 0) throw new Error('Пустой заказ')
  if (input.items.length > 100) throw new Error('Слишком много позиций')
  const tableNote = cleanStr(input?.tableNote, 140) || null
  const isVIP = input?.isVIP === true ? 1 : 0
  const period = input?.period === 'breakfast' ? 'breakfast' : 'lunch'
  const clientOrderId = cleanStr(input?.clientOrderId, 64) || null

  // идемпотентность: повторная отправка того же чека (реконнект/ретрай)
  if (clientOrderId) {
    const existing = db
      .prepare(`SELECT * FROM orders WHERE client_order_id = ?`)
      .get(clientOrderId) as OrderRow | undefined
    if (existing) {
      const active = existing.status !== 'served'
      return { order: hydrate(existing), isAddendum: active && existing.addendum_count > 0, duplicate: true }
    }
  }

  // слияние дубликатов позиции (блюдо + гарнир + комментарий)
  const merged = new Map<
    string,
    { menuItemId: string; qty: number; comment: string; garnishId: string | null; standalone: boolean }
  >()
  for (const raw of input.items) {
    const menuItemId = String(raw?.menuItemId ?? '')
    const menu = SERVER_MENU[menuItemId]
    if (!menu) throw new Error(`Неизвестная позиция меню: ${menuItemId || '—'}`)
    const qty = clampInt(raw?.qty, 1, 50, 1)
    const comment = cleanStr(raw?.comment, 80)
    const wantsStandalone = raw?.standalone === true

    if (wantsStandalone) {
      if (!menu.isGarnish) throw new Error(`Позиция не является гарниром: ${menu.name}`)
    }

    let garnishId: string | null = null
    if (raw?.garnishId != null) {
      const gid = String(raw.garnishId)
      if (!GARNISH_IDS.has(gid)) throw new Error(`Неизвестный гарнир: ${gid || '—'}`)
      if (!ATTACHABLE_CATEGORIES.has(menu.category)) {
        throw new Error(`Гарнир не подходит к позиции: ${menu.name}`)
      }
      garnishId = gid
    }

    const key = `${menuItemId}::${garnishId ?? ''}::${comment}::${wantsStandalone ? 1 : 0}`
    const prev = merged.get(key)
    if (prev) prev.qty = Math.min(50, prev.qty + qty)
    else merged.set(key, { menuItemId, qty, comment, garnishId, standalone: wantsStandalone })
  }

  // активный заказ стола (не отдан) → дозаказ
  const activeOrder = db
    .prepare(`SELECT * FROM orders WHERE table_id = ? AND status != 'served' ORDER BY sent_at DESC LIMIT 1`)
    .get(tableId) as OrderRow | undefined

  const now = Date.now()
  const insertItem = db.prepare(
    `INSERT INTO order_items
       (id, order_id, menu_item_id, name, qty, comment, station, course_priority, category, status, garnish_id, garnish_name, is_standalone, is_addendum, table_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const tx = db.transaction(() => {
    if (activeOrder) {
      // дозаказ: новые позиции едут в тот же тикет с меткой
      const itemStatus = activeOrder.status === 'sent' ? 'queued' : 'cooking'
      for (const m of merged.values()) {
        const menu = SERVER_MENU[m.menuItemId]
        insertItem.run(
          uid(), activeOrder.id, m.menuItemId, menu.name, m.qty, m.comment || null,
          menu.station, menu.coursePriority, menu.category, itemStatus,
          m.garnishId, m.garnishId ? (SERVER_MENU[m.garnishId]?.name ?? null) : null,
          m.standalone ? 1 : 0, 1, tableId,
        )
      }
      db.prepare(`UPDATE orders SET addendum_count = addendum_count + 1 WHERE id = ?`).run(activeOrder.id)
      // на раздаче уже стояли блюда + приехал дозаказ → снова в работе
      if (activeOrder.status === 'ready') {
        db.prepare(`UPDATE orders SET status = 'cooking', ready_at = NULL WHERE id = ?`).run(activeOrder.id)
      }
    } else {
      const orderId = uid()
      db.prepare(
        `INSERT INTO orders (id, client_order_id, table_id, waiter_name, is_vip, table_note, status, period, sent_at, addendum_count)
         VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, 0)`,
      ).run(orderId, clientOrderId, tableId, waiterName, isVIP, tableNote, period, now)
      for (const m of merged.values()) {
        const menu = SERVER_MENU[m.menuItemId]
        insertItem.run(
          uid(), orderId, m.menuItemId, menu.name, m.qty, m.comment || null,
          menu.station, menu.coursePriority, menu.category, 'queued',
          m.garnishId, m.garnishId ? (SERVER_MENU[m.garnishId]?.name ?? null) : null,
          m.standalone ? 1 : 0, 0, tableId,
        )
      }
    }
  })
  tx()

  const finalRow = db
    .prepare(`SELECT * FROM orders WHERE table_id = ? AND status != 'served' ORDER BY sent_at DESC LIMIT 1`)
    .get(tableId) as OrderRow
  return { order: hydrate(finalRow), isAddendum: !!activeOrder, duplicate: false }
}

/* ---------- машина статусов ---------- */

function findOrder(orderId: unknown): OrderRow | undefined {
  const id = String(orderId ?? '')
  if (!id) return undefined
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined
}

/** Шаг 1 кухни: ПРИНЯТЬ В РАБОТУ (sent → cooking, позиции запущены) */
export function acceptOrder(orderId: unknown): ApiOrder | null {
  const o = findOrder(orderId)
  if (!o || o.status !== 'sent') return null
  const now = Date.now()
  const tx = db.transaction(() => {
    db.prepare(`UPDATE orders SET status = 'cooking', accepted_at = ? WHERE id = ?`).run(now, o.id)
    db.prepare(`UPDATE order_items SET status = 'cooking' WHERE order_id = ? AND status = 'queued'`).run(o.id)
  })
  tx()
  return hydrate(findOrder(o.id)!)
}

/** Шаг 2 кухни: ГОТОВО! — все позиции на раздаче */
export function readyOrder(orderId: unknown): ApiOrder | null {
  const o = findOrder(orderId)
  if (!o || (o.status !== 'cooking' && o.status !== 'sent')) return null
  const now = Date.now()
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE orders SET status = 'ready', ready_at = ?, accepted_at = COALESCE(accepted_at, ?) WHERE id = ?`,
    ).run(now, now, o.id)
    db.prepare(`UPDATE order_items SET status = 'ready' WHERE order_id = ?`).run(o.id)
  })
  tx()
  return hydrate(findOrder(o.id)!)
}

/** Шаг 3 раздачи: ОТДАНО РАННЕРУ (ready → served, в аналитику) */
export function serveOrder(orderId: unknown): ApiOrder | null {
  const o = findOrder(orderId)
  if (!o || o.status !== 'ready') return null
  const now = Date.now()
  db.prepare(`UPDATE orders SET status = 'served', served_at = ?, served_day = ? WHERE id = ?`).run(
    now,
    dayKey(now),
    o.id,
  )
  return hydrate(findOrder(o.id)!)
}

export interface ToggleResult {
  ok: boolean
  order: ApiOrder | null
  becameReady: boolean
  error?: string
}

/** Тап по позиции на кухне: cooking ↔ ready (с автопромоушеном заказа) */
export function toggleItem(itemId: unknown): ToggleResult {
  const id = String(itemId ?? '')
  if (!id) return { ok: false, order: null, becameReady: false, error: 'Нет позиции' }
  const item = db.prepare(`SELECT * FROM order_items WHERE id = ?`).get(id) as ItemRow | undefined
  if (!item) return { ok: false, order: null, becameReady: false, error: 'Позиция не найдена' }
  const order = findOrder(item.order_id)
  if (!order) return { ok: false, order: null, becameReady: false, error: 'Заказ не найден' }
  if (order.status === 'sent') {
    return { ok: false, order: null, becameReady: false, error: 'Заказ ещё не принят шефом' }
  }
  if (order.status === 'served') {
    return { ok: false, order: null, becameReady: false, error: 'Заказ уже отдан' }
  }

  const next = item.status === 'ready' ? 'cooking' : 'ready'
  db.prepare(`UPDATE order_items SET status = ? WHERE id = ?`).run(next, id)

  // пересборка статуса заказа
  const statuses = (itemsByOrder.all(order.id) as ItemRow[]).map((i) => i.status)
  let becameReady = false
  if (statuses.length > 0 && statuses.every((s) => s === 'ready') && order.status === 'cooking') {
    db.prepare(`UPDATE orders SET status = 'ready', ready_at = ? WHERE id = ?`).run(Date.now(), order.id)
    becameReady = true
  } else if (statuses.some((s) => s !== 'ready') && order.status === 'ready') {
    db.prepare(`UPDATE orders SET status = 'cooking', ready_at = NULL WHERE id = ?`).run(order.id)
  }
  return { ok: true, order: hydrate(findOrder(order.id)!), becameReady }
}

/** Утренний сброс: пин-код 0000 → чистый лист */
export function resetShift(pin: unknown): boolean {
  const p = String(pin ?? '')
  if (p !== '0000') return false
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM order_items`)
    db.exec(`DELETE FROM orders`)
  })
  tx()
  return true
}

/** Чистка старых данных (при старте сервиса) */
export function pruneOld(): void {
  try {
    const cutoffDay = dayKey(Date.now() - 3 * 24 * 60 * 60 * 1000)
    db.prepare(
      `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE served_day IS NOT NULL AND served_day < ?)`,
    ).run(cutoffDay)
    db.prepare(`DELETE FROM orders WHERE served_day IS NOT NULL AND served_day < ?`).run(cutoffDay)
  } catch {
    /* no-op */
  }
}

pruneOld()
