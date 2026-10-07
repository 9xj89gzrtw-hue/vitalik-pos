import type { CheckItem, CoursePriority, ItemStatus, Order, OrderItem, Station } from './types'
import { DATIVE_NAMES, findMenuItem, GARNISH_CATEGORY } from './menu'

/* ============================================================
   Производные выборки (чистые функции над состоянием)
   ============================================================ */

/** Черновик чека: количество позиций и суммарное количество штук */
export function checkTotals(check: CheckItem[] | undefined): { lines: number; pieces: number } {
  if (!check?.length) return { lines: 0, pieces: 0 }
  return {
    lines: check.length,
    pieces: check.reduce((acc, c) => acc + c.qty, 0),
  }
}

export type TableKitchenStatus = 'none' | 'new' | 'cooking' | 'ready'

/** Статус стола для точки-индикатора у официанта */
export function getTableStatus(orders: Order[], tableNumber: number): TableKitchenStatus {
  const items = orders
    .filter((o) => o.tableNumber === tableNumber)
    .flatMap((o) => o.items)
  if (!items.length) return 'none'
  if (items.every((i) => i.status === 'done')) return 'ready'
  if (items.some((i) => i.status === 'cooking')) return 'cooking'
  return 'new'
}

/** У стола есть хотя бы одно готовое блюдо → «Забрать с кухни!» */
export function tableHasReady(orders: Order[], tableNumber: number): boolean {
  return orders.some(
    (o) => o.tableNumber === tableNumber && o.items.some((i) => i.status === 'done'),
  )
}

/** «12:45» — время отправки заказа */
export function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «только что» / «12 мин назад» / «1 ч 05 мин назад» */
export function formatAgo(ts: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - ts) / 1000))
  if (sec < 45) return 'только что'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} ${plural(min, 'минуту', 'минуты', 'минут')} назад`
  const h = Math.floor(min / 60)
  if (h < 24) {
    const m = min % 60
    return m === 0
      ? `${h} ${plural(h, 'час', 'часа', 'часов')} назад`
      : `${h} ${plural(h, 'час', 'часа', 'часов')} ${String(m).padStart(2, '0')} мин назад`
  }
  return 'более суток назад'
}

/* ---------- Агрегация для режима «Сводка цеха» ---------- */

export interface AggEntry {
  tableNumber: number
  /** штук (только не отданные) */
  qty: number
  anyCooking: boolean
  /** для гарниров: короткое имя блюда, к которому привязан («Утке») */
  attachedTo?: string
}

export interface AggRow {
  menuItemId: string
  name: string
  station: Station
  coursePriority: CoursePriority
  /** строка гарнира: агрегирует и привязанные, и отдельные порции */
  isGarnish: boolean
  totalQty: number
  entries: AggEntry[]
  itemIds: string[]
  anyCooking: boolean
  /** самый ранний заказ среди позиций (для сортировки FIFO) */
  earliestAt: number
}

export interface CourseGroup {
  priority: CoursePriority
  title: string
  rows: AggRow[]
  totalQty: number
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

/** Единица агрегации: блюдо либо гарнир (привязанный к блюду / отдельный) */
interface BatchUnit {
  rowKey: string
  menuItemId: string
  name: string
  category: string
  station: Station
  coursePriority: CoursePriority
  isGarnish: boolean
  qty: number
  itemIds: string[]
  status: ItemStatus
  tableNumber: number
  /** для привязанных гарниров — блюдо в дательном падеже («Утке») */
  attachedTo?: string
  createdAt: number
}

function unitsFromOrders(orders: Order[]): BatchUnit[] {
  const units: BatchUnit[] = []
  for (const order of orders) {
    for (const item of order.items) {
      if (item.status === 'done') continue
      const category = item.category ?? findMenuItem(item.menuItemId)?.category ?? ''
      const isStandaloneGarnish = category === GARNISH_CATEGORY && !item.garnishId

      /* строка самого блюда (для отдельного гарнира — его собственная строка гарнира) */
      units.push({
        rowKey: item.menuItemId,
        menuItemId: item.menuItemId,
        name: item.name,
        category,
        station: item.station,
        coursePriority: item.coursePriority,
        isGarnish: isStandaloneGarnish,
        qty: item.qty,
        itemIds: [item.id],
        status: item.status,
        tableNumber: order.tableNumber,
        createdAt: order.createdAt,
      })

      /* привязанный гарнир — отдельная единица в блоке гарниров */
      if (item.garnishId) {
        const garnish = findMenuItem(item.garnishId)
        units.push({
          rowKey: item.garnishId,
          menuItemId: item.garnishId,
          name: item.garnishName ?? garnish?.name ?? 'Гарнир',
          category: GARNISH_CATEGORY,
          station: garnish?.station ?? 'hot_main',
          coursePriority: garnish?.coursePriority ?? 3,
          isGarnish: true,
          qty: item.qty,
          itemIds: [item.id],
          status: item.status,
          tableNumber: order.tableNumber,
          attachedTo: DATIVE_NAMES[item.menuItemId] ?? item.name,
          createdAt: order.createdAt,
        })
      }
    }
  }
  return units
}

/**
 * Группировка всех активных (не отданных) позиций по курсам и блюдам.
 * Готовые ('done') позиции исключаются — они «исчезают» с доски.
 * Гарниры (привязанные и отдельные) агрегируются в общие строки внутри своего курса.
 */
export function buildCourseGroups(
  orders: Order[],
  courseTitles: Record<CoursePriority, string>,
): CourseGroup[] {
  const byRow = new Map<string, AggRow>()
  const byCourseItems = new Map<CoursePriority, Set<string>>() // category names

  for (const unit of unitsFromOrders(orders)) {
    let row = byRow.get(unit.rowKey)
    if (!row) {
      row = {
        menuItemId: unit.menuItemId,
        name: unit.name,
        station: unit.station,
        coursePriority: unit.coursePriority,
        isGarnish: unit.isGarnish,
        totalQty: 0,
        entries: [],
        itemIds: [],
        anyCooking: false,
        earliestAt: unit.createdAt,
      }
      byRow.set(unit.rowKey, row)
    }
    row.totalQty += unit.qty
    row.itemIds.push(...unit.itemIds)
    row.earliestAt = Math.min(row.earliestAt, unit.createdAt)
    if (unit.status === 'cooking') row.anyCooking = true

    let entry = row.entries.find(
      (e) => e.tableNumber === unit.tableNumber && e.attachedTo === unit.attachedTo,
    )
    if (!entry) {
      entry = { tableNumber: unit.tableNumber, qty: 0, anyCooking: false, attachedTo: unit.attachedTo }
      row.entries.push(entry)
    }
    entry.qty += unit.qty
    if (unit.status === 'cooking') entry.anyCooking = true

    const cats = byCourseItems.get(unit.coursePriority) ?? new Set<string>()
    if (unit.category) cats.add(unit.category)
    byCourseItems.set(unit.coursePriority, cats)
  }

  const groups: CourseGroup[] = ([1, 2, 3, 4] as CoursePriority[]).map((priority) => {
    const rows = [...byRow.values()]
      .filter((r) => r.coursePriority === priority)
      .sort((a, b) => a.earliestAt - b.earliestAt || a.name.localeCompare(b.name, 'ru'))
    const cats = [...(byCourseItems.get(priority) ?? [])]
    const title =
      cats.length === 0
        ? courseTitles[priority]
        : cats.map(titleCase).sort((a, b) => a.localeCompare(b, 'ru')).join(' · ')
    return {
      priority,
      title,
      rows,
      totalQty: rows.reduce((acc, r) => acc + r.totalQty, 0),
    }
  })

  return groups
}

/** Тикеты «по столам»: активные заказы, сгруппированные по столу */
export interface TableTicket {
  tableNumber: number
  orders: Order[]
  items: OrderItem[]
  /** самый ранний заказ стола (для таймера) */
  startedAt: number
  pieces: number
  donePieces: number
}

export function buildTableTickets(orders: Order[]): TableTicket[] {
  const byTable = new Map<number, Order[]>()
  for (const order of orders) {
    const list = byTable.get(order.tableNumber) ?? []
    list.push(order)
    byTable.set(order.tableNumber, list)
  }
  return [...byTable.entries()]
    .map(([tableNumber, tableOrders]) => {
      const items = tableOrders.flatMap((o) => o.items)
      const sorted = [...tableOrders].sort((a, b) => a.createdAt - b.createdAt)
      return {
        tableNumber,
        orders: sorted,
        items: [...items].sort((a, b) => a.coursePriority - b.coursePriority),
        startedAt: sorted[0]?.createdAt ?? Date.now(),
        pieces: items.reduce((acc, i) => acc + i.qty, 0),
        donePieces: items.filter((i) => i.status === 'done').reduce((acc, i) => acc + i.qty, 0),
      }
    })
    .sort((a, b) => a.startedAt - b.startedAt)
}

/** Пороги таймера тикета: 0–10 мин зелёный, 10–20 жёлтый, >20 красный */
export type TimerLevel = 'ok' | 'warn' | 'late'

export function timerLevel(elapsedMs: number): TimerLevel {
  const min = elapsedMs / 60000
  if (min < 10) return 'ok'
  if (min < 20) return 'warn'
  return 'late'
}

export function formatElapsed(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const plural = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
