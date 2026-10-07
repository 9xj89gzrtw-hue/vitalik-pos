import type { CheckItem, CoursePriority, Order, OrderItem, Station } from './types'
import { findMenuItem } from './menu'

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

/* ---------- Агрегация для режима «Сводка цеха» ---------- */

export interface AggEntry {
  tableNumber: number
  /** штук (только не отданные) */
  qty: number
  anyCooking: boolean
}

export interface AggRow {
  menuItemId: string
  name: string
  station: Station
  coursePriority: CoursePriority
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

/**
 * Группировка всех активных (не отданных) позиций по курсам и блюдам.
 * Готовые ('done') позиции исключаются — они «исчезают» с доски.
 */
export function buildCourseGroups(
  orders: Order[],
  courseTitles: Record<CoursePriority, string>,
): CourseGroup[] {
  const byDish = new Map<string, AggRow>()
  const byCourseItems = new Map<CoursePriority, Set<string>>() // category names

  for (const order of orders) {
    for (const item of order.items) {
      if (item.status === 'done') continue
      let row = byDish.get(item.menuItemId)
      if (!row) {
        row = {
          menuItemId: item.menuItemId,
          name: item.name,
          station: item.station,
          coursePriority: item.coursePriority,
          totalQty: 0,
          entries: [],
          itemIds: [],
          anyCooking: false,
          earliestAt: order.createdAt,
        }
        byDish.set(item.menuItemId, row)
      }
      row.totalQty += item.qty
      row.itemIds.push(item.id)
      row.earliestAt = Math.min(row.earliestAt, order.createdAt)
      if (item.status === 'cooking') row.anyCooking = true

      let entry = row.entries.find((e) => e.tableNumber === order.tableNumber)
      if (!entry) {
        entry = { tableNumber: order.tableNumber, qty: 0, anyCooking: false }
        row.entries.push(entry)
      }
      entry.qty += item.qty
      if (item.status === 'cooking') entry.anyCooking = true

      const cats = byCourseItems.get(item.coursePriority) ?? new Set<string>()
      const category = item.category ?? findMenuItem(item.menuItemId)?.category ?? ''
      if (category) cats.add(category)
      byCourseItems.set(item.coursePriority, cats)
    }
  }

  const groups: CourseGroup[] = ([1, 2, 3, 4] as CoursePriority[]).map((priority) => {
    const rows = [...byDish.values()]
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
