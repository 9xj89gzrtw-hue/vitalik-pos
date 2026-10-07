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
    created_at   INTEGER NOT NULL,
    is_addition  INTEGER NOT NULL DEFAULT 0
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
    status         TEXT    NOT NULL DEFAULT 'new',
    garnish_id     TEXT,
    garnish_name   TEXT,
    is_addition    INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_items_order     ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_items_status    ON order_items(status);
`)

/* ---------- миграции для существующих БД (ALTER, если колонок нет) ---------- */

function ensureColumn(table: 'orders' | 'order_items', column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}
ensureColumn('orders', 'is_addition', 'is_addition INTEGER NOT NULL DEFAULT 0')
ensureColumn('order_items', 'garnish_id', 'garnish_id TEXT')
ensureColumn('order_items', 'garnish_name', 'garnish_name TEXT')
ensureColumn('order_items', 'is_addition', 'is_addition INTEGER NOT NULL DEFAULT 0')

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

/* ---------- гарниры: серверная валидация ---------- */

const GARNISH_IDS = new Set(['sd1', 'sd2', 'sd3'])
const ATTACHABLE_CATEGORIES = new Set(['ГОРЯЧИЕ ЗАКУСКИ', 'ГОРЯЧИЕ БЛЮДА'])

/* ---------- типы строк ---------- */

interface OrderRow {
  id: string
  table_number: number
  period: string
  status: string
  created_at: number
  is_addition: number
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
  is_addition: number
}

export interface ApiOrder {
  id: string
  tableNumber: number
  period: string
  status: 'active' | 'archived'
  createdAt: number
  /** заказ-дозаказ: у стола уже были активные заказы */
  isAddition: boolean
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
    garnishId: string | null
    garnishName: string | null
    isAddition: boolean
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
    isAddition: o.is_addition === 1,
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
      garnishId: i.garnish_id ?? null,
      garnishName: i.garnish_name ?? null,
      isAddition: i.is_addition === 1,
    })),
  }))
}

export interface CreateOrderInput {
  tableNumber: number
  period: 'breakfast' | 'lunch'
  items: { menuItemId: string; qty: number; comment?: string; garnishId?: string }[]
}

/** Создание заказа. Возвращает готовый объект или throws Error с текстом. */
export function createOrder(input: CreateOrderInput): ApiOrder {
  const tableNumber = strictInt(input?.tableNumber, 1, 15)
  if (tableNumber === null) throw new Error('Некорректный стол')
  const period = input?.period === 'breakfast' ? 'breakfast' : input?.period === 'lunch' ? 'lunch' : null
  if (!period) throw new Error('Некорректный период')
  if (!Array.isArray(input?.items) || input.items.length === 0) throw new Error('Пустой заказ')
  if (input.items.length > 100) throw new Error('Слишком много позиций')

  // сливаем дубли (одинаковая позиция + гарнир + комментарий)
  const merged = new Map<
    string,
    { menuItemId: string; qty: number; comment: string; garnishId: string | null }
  >()
  for (const raw of input.items) {
    const menuItemId = String(raw?.menuItemId ?? '')
    const menu = SERVER_MENU[menuItemId]
    if (!menu) throw new Error(`Неизвестная позиция меню: ${menuItemId || '—'}`)
    const qty = clampInt(raw?.qty, 1, 50, 1)
    const comment = cleanStr(raw?.comment, 80)

    // гарнир: только из списка и только к «attachable»-категориям
    let garnishId: string | null = null
    if (raw?.garnishId != null) {
      const gid = String(raw.garnishId)
      if (!GARNISH_IDS.has(gid)) throw new Error(`Неизвестный гарнир: ${gid || '—'}`)
      if (!ATTACHABLE_CATEGORIES.has(menu.category)) {
        throw new Error(`Гарнир не подходит к позиции: ${menu.name}`)
      }
      garnishId = gid
    }

    const key = `${menuItemId}::${garnishId ?? ''}::${comment}`
    const prev = merged.get(key)
    if (prev) prev.qty = Math.min(50, prev.qty + qty)
    else merged.set(key, { menuItemId, qty, comment, garnishId })
  }

  const orderId = uid()
  const createdAt = Date.now()
  // дозаказ: у стола уже есть активные заказы (считаем ДО вставки нового)
  const activeCount = (
    db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE table_number = ? AND status = 'active'`).get(
      tableNumber,
    ) as { n: number }
  ).n
  const isAddition = activeCount > 0 ? 1 : 0

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, table_number, period, status, created_at, is_addition)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  )
  const insertItem = db.prepare(
    `INSERT INTO order_items
       (id, order_id, menu_item_id, name, qty, comment, station, course_priority, category, status, garnish_id, garnish_name, is_addition)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
  )

  const tx = db.transaction(() => {
    insertOrder.run(orderId, tableNumber, period, createdAt, isAddition)
    for (const { menuItemId, qty, comment, garnishId } of merged.values()) {
      const menu = SERVER_MENU[menuItemId]
      const garnishName = garnishId ? (SERVER_MENU[garnishId]?.name ?? null) : null
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
        garnishId,
        garnishName,
        isAddition,
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
