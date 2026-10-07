import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/* ============================================================
   Пасс — хранилище заказов (SQLite, только для этого сервиса).
   Путь: <project>/db/pos.db
   ============================================================ */

const DB_PATH = join(import.meta.dir, '..', '..', 'db', 'pos.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH, { create: true })
db.exec('PRAGMA journal_mode = WAL;')
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL,
    period       TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'active',
    created_at   INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id             TEXT PRIMARY KEY,
    order_id       TEXT    NOT NULL,
    menu_item_id   TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    qty            INTEGER NOT NULL,
    comment        TEXT,
    station        TEXT    NOT NULL,
    course_priority INTEGER NOT NULL,
    category       TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'new'
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_items_order     ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_items_status    ON order_items(status);
`)

/* ---------- серверная копия меню (синхронно с src/lib/menu.ts) ---------- */

export interface ServerMenuItem {
  name: string
  station: string
  coursePriority: number
  category: string
}

export const SERVER_MENU: Record<string, ServerMenuItem> = {
  b1: { name: 'Овсяная каша со свежими фруктами', station: 'breakfast', coursePriority: 1, category: 'Завтраки' },
  b2: { name: 'Мини-сырники с муссом, сметаной и Nutella от Ferrero', station: 'breakfast', coursePriority: 1, category: 'Завтраки' },
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
  sd1: { name: 'Картофель беби', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ' },
  sd2: { name: 'Овощное соте', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ' },
  sd3: { name: 'Жасминовый рис припущенный', station: 'hot_main', coursePriority: 3, category: 'ГАРНИРЫ' },
  d1: { name: 'Брауни с фундуком и Nutella', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
  d2: { name: 'Томленая слива со сливочным лабне', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
  d3: { name: 'Мини-чизкейк', station: 'pastry', coursePriority: 4, category: 'ДЕСЕРТЫ' },
}

/* ---------- типы строк ---------- */

interface OrderRow {
  id: string
  table_number: number
  period: string
  status: string
  created_at: number
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
}

export interface ApiOrder {
  id: string
  tableNumber: number
  period: string
  status: 'active' | 'archived'
  createdAt: number
  items: {
    id: string
    orderId: string
    menuItemId: string
    name: string
    qty: number
    comment: string | null
    station: string
    coursePriority: number
    category: string
    status: 'new' | 'cooking' | 'done'
    tableNumber: number
  }[]
}

/* ---------- санитайзеры ---------- */

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** строгое целое в диапазоне (не клампирует — отклоняет) */
const strictInt = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

const cleanStr = (v: unknown, maxLen: number): string =>
  typeof v === 'string' ? v.trim().slice(0, maxLen) : ''

const uid = (): string => crypto.randomUUID()

/* ---------- публичные операции ---------- */

export function loadActiveOrders(): ApiOrder[] {
  const orders = db
    .prepare(`SELECT * FROM orders WHERE status = 'active' ORDER BY created_at ASC`)
    .all() as OrderRow[]
  if (!orders.length) return []
  const itemsStmt = db.prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid ASC`)
  return orders.map((o) => ({
    id: o.id,
    tableNumber: o.table_number,
    period: o.period,
    status: 'active' as const,
    createdAt: o.created_at,
    items: (itemsStmt.all(o.id) as ItemRow[]).map((i) => ({
      id: i.id,
      orderId: i.order_id,
      menuItemId: i.menu_item_id,
      name: i.name,
      qty: i.qty,
      comment: i.comment,
      station: i.station,
      coursePriority: i.course_priority,
      category: i.category,
      status: i.status as 'new' | 'cooking' | 'done',
      tableNumber: o.table_number,
    })),
  }))
}

export interface CreateOrderInput {
  tableNumber: number
  period: 'breakfast' | 'lunch'
  items: { menuItemId: string; qty: number; comment?: string }[]
}

/** Создание заказа. Возвращает готовый объект или throws Error с текстом. */
export function createOrder(input: CreateOrderInput): ApiOrder {
  const tableNumber = strictInt(input?.tableNumber, 1, 15)
  if (tableNumber === null) throw new Error('Некорректный стол')
  const period = input?.period === 'breakfast' ? 'breakfast' : input?.period === 'lunch' ? 'lunch' : null
  if (!period) throw new Error('Некорректный период')
  if (!Array.isArray(input?.items) || input.items.length === 0) throw new Error('Пустой заказ')
  if (input.items.length > 100) throw new Error('Слишком много позиций')

  // сливаем дубли (одинаковая позиция + комментарий)
  const merged = new Map<string, { menuItemId: string; qty: number; comment: string }>()
  for (const raw of input.items) {
    const menuItemId = String(raw?.menuItemId ?? '')
    const menu = SERVER_MENU[menuItemId]
    if (!menu) throw new Error(`Неизвестная позиция меню: ${menuItemId || '—'}`)
    const qty = clampInt(raw?.qty, 1, 50, 1)
    const comment = cleanStr(raw?.comment, 80)
    const key = `${menuItemId}::${comment}`
    const prev = merged.get(key)
    if (prev) prev.qty = Math.min(50, prev.qty + qty)
    else merged.set(key, { menuItemId, qty, comment })
  }

  const orderId = uid()
  const createdAt = Date.now()
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, table_number, period, status, created_at) VALUES (?, ?, ?, 'active', ?)`,
  )
  const insertItem = db.prepare(
    `INSERT INTO order_items (id, order_id, menu_item_id, name, qty, comment, station, course_priority, category, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
  )

  const tx = db.transaction(() => {
    insertOrder.run(orderId, tableNumber, period, createdAt)
    for (const { menuItemId, qty, comment } of merged.values()) {
      const menu = SERVER_MENU[menuItemId]
      insertItem.run(
        uid(),
        orderId,
        menuItemId,
        menu.name,
        qty,
        comment || null,
        menu.station,
        menu.coursePriority,
        menu.category,
      )
    }
  })
  tx()

  const order = loadActiveOrders().find((o) => o.id === orderId)
  if (!order) throw new Error('Не удалось создать заказ')
  return order
}

const STATUSES = new Set(['new', 'cooking', 'done'])

/** Батч-обновление статусов позиций; возвращает число изменённых */
export function setItemsStatus(ids: unknown, status: unknown): number {
  if (!Array.isArray(ids) || ids.length === 0) return 0
  const st = String(status ?? '')
  if (!STATUSES.has(st)) return 0
  const clean = ids.map((x) => String(x)).filter(Boolean).slice(0, 500)
  if (!clean.length) return 0
  const placeholders = clean.map(() => '?').join(', ')
  const res = db
    .prepare(`UPDATE order_items SET status = ? WHERE id IN (${placeholders})`)
    .run(st, ...clean)
  return Number(res.changes ?? 0)
}

/** Архивация всех активных заказов стола; возвращает число заказов */
export function archiveTable(tableNumber: unknown): number {
  const t = strictInt(tableNumber, 1, 15)
  if (t === null) return 0
  const res = db
    .prepare(`UPDATE orders SET status = 'archived' WHERE table_number = ? AND status = 'active'`)
    .run(t)
  return Number(res.changes ?? 0)
}
