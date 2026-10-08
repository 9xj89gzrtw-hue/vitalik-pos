import type { Order, OrderItem, OrderStatus, StopControl, StopList } from './types'
import { DATIVE_NAMES, tableShortOf } from './menu'

/* ============================================================
   ВИТАЛИК — производные структуры: стадии заказа, радар столов,
   группировка тикетов кухни, сводка цехов, таймеры, стоп-лист.
   ============================================================ */

/* ---------- 3-стадийная шкала для зала ---------- */

export type StageKey = 'sent' | 'cooking' | 'ready'

export interface StageState {
  key: StageKey
  label: string
  reached: boolean
  active: boolean
  time: number | null
}

export const STAGE_LABELS: Record<StageKey, string> = {
  sent: 'В очереди',
  cooking: 'Готовится',
  ready: 'НА РАЗДАЧЕ',
}

/** ⏳ В очереди → 🔥 Готовится → 🟢 ГОТОВО НА РАЗДАЧЕ (served = всё пройдено) */
export function orderStages(o: Order): StageState[] {
  const st = o.status
  return [
    { key: 'sent', label: STAGE_LABELS.sent, reached: true, active: st === 'sent', time: o.sentAt },
    {
      key: 'cooking',
      label: STAGE_LABELS.cooking,
      reached: st === 'cooking' || st === 'ready' || st === 'served',
      active: st === 'cooking',
      time: o.acceptedAt,
    },
    {
      key: 'ready',
      label: STAGE_LABELS.ready,
      reached: st === 'ready' || st === 'served',
      active: st === 'ready',
      time: o.readyAt,
    },
  ]
}

/* ---------- стоп-лист и остатки ---------- */

const NO_STOP: StopControl = { stopped: false, remaining: null }

/** Текущее состояние блюда в стоп-листе (с безопасным дефолтом) */
export function stopInfo(stopList: StopList, menuItemId: string): StopControl {
  return stopList?.[menuItemId] ?? NO_STOP
}

/** Блюдо доступно к заказу? */
export function isDishAvailable(stopList: StopList, menuItemId: string): boolean {
  const c = stopInfo(stopList, menuItemId)
  return !c.stopped && (c.remaining == null || c.remaining > 0)
}

/* ---------- выборки ---------- */

export function activeOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status !== 'served')
}

export function servedToday(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'served')
}

export function orderPieces(o: Order): number {
  return o.items.reduce((acc, i) => acc + i.qty, 0)
}

/* ---------- радар зала ---------- */

export type TableStatus = 'free' | 'sent' | 'cooking' | 'ready'

export interface TableState {
  status: TableStatus
  order: Order | null
  /** заказ висит дольше 20 минут и ещё не на раздаче */
  overdue: boolean
}

export const LATE_THRESHOLD_MS = 20 * 60 * 1000

export function buildTableMap(orders: Order[], now = Date.now()): Map<string, TableState> {
  const map = new Map<string, TableState>()
  for (const o of orders) {
    if (o.status === 'served') continue
    // активных заказов на столе максимум один (дозаказы склеиваются)
    const prev = map.get(o.tableId)
    if (!prev || o.sentAt < prev.order!.sentAt) {
      map.set(o.tableId, {
        status: o.status as TableStatus,
        order: o,
        overdue:
          (o.status === 'sent' || o.status === 'cooking') &&
          now - o.sentAt > LATE_THRESHOLD_MS,
      })
    }
  }
  return map
}

/* ---------- группировка тикета кухни ---------- */

export interface KitchenGroup {
  title: string
  items: OrderItem[]
}

const STATION_TITLES: { station: string; title: string }[] = [
  { station: 'breakfast', title: 'ЗАВТРАКИ' },
  { station: 'cold', title: 'САЛАТЫ' },
  { station: 'hot_appetizer', title: 'ГОРЯЧИЕ ЗАКУСКИ' },
  { station: 'hot_main', title: 'ГОРЯЧИЕ БЛЮДА И ГАРНИРЫ' },
  { station: 'pastry', title: 'ДЕСЕРТЫ' },
]

export interface KitchenTicket {
  groups: KitchenGroup[]
  addendumItems: OrderItem[]
}

export function buildKitchenTicket(o: Order): KitchenTicket {
  const main = o.items.filter((i) => !i.isAddendum)
  const addendumItems = o.items.filter((i) => i.isAddendum)
  const groups: KitchenGroup[] = []
  for (const { station, title } of STATION_TITLES) {
    const items = main.filter((i) => i.station === station)
    if (items.length) groups.push({ title, items })
  }
  return { groups, addendumItems }
}

/* ---------- сводка цехов (батчинг) ---------- */

export interface BatchChip {
  label: string
  qty: number
  vip: boolean
}

export interface BatchRow {
  key: string
  name: string
  totalQty: number
  chips: BatchChip[]
}

export interface BatchSection {
  key: string
  title: string
  rows: BatchRow[]
  totalQty: number
}

/** Сводка по всем активным столам: блюда в работе (queued + cooking) */
export function buildBatch(orders: Order[]): BatchSection[] {
  const live = activeOrders(orders)
  const sections: BatchSection[] = []

  const pushRow = (map: Map<string, BatchRow>, key: string, name: string, chip: BatchChip, qty: number) => {
    const row = map.get(key) ?? { key, name, totalQty: 0, chips: [] }
    row.totalQty += qty
    const existing = row.chips.find((c) => c.label === chip.label && c.vip === chip.vip)
    if (existing) existing.qty += qty
    else row.chips.push({ ...chip, qty })
    map.set(key, row)
  }

  for (const { station, title } of STATION_TITLES) {
    const map = new Map<string, BatchRow>()
    for (const o of live) {
      for (const item of o.items) {
        if (item.station !== station) continue
        if (item.status === 'ready') continue
        // отдельные гарниры идут в агрегированный блок ГАРНИРЫ
        if (station === 'hot_main' && item.standalone) continue
        if (station === 'hot_main' && item.garnishId) {
          // само блюдо с привязанным гарниром остаётся строкой «Утиная грудка»
        }
        pushRow(
          map,
          item.menuItemId,
          item.name,
          { label: tableShortOf(o.tableId), qty: 0, vip: o.isVIP },
          item.qty,
        )
      }
    }
    const rows = [...map.values()].sort((a, b) => b.totalQty - a.totalQty)
    if (rows.length) {
      sections.push({
        key: station,
        title,
        rows,
        totalQty: rows.reduce((acc, r) => acc + r.totalQty, 0),
      })
    }
  }

  // агрегированный блок ГАРНИРЫ: привязанные (контекст «к Утке») + отдельные
  const garnishMap = new Map<string, BatchRow>()
  for (const o of live) {
    for (const item of o.items) {
      if (item.status === 'ready') continue
      if (item.standalone) {
        pushRow(
          garnishMap,
          `standalone:${item.menuItemId}`,
          `${item.name} (отдельно)`,
          { label: tableShortOf(o.tableId), qty: 0, vip: o.isVIP },
          item.qty,
        )
      } else if (item.garnishId) {
        const dative = DATIVE_NAMES[item.menuItemId] ?? item.name
        pushRow(
          garnishMap,
          `attached:${item.garnishId}`,
          item.garnishName ?? item.name,
          { label: `${tableShortOf(o.tableId)} · к ${dative}`, qty: 0, vip: o.isVIP },
          item.qty,
        )
      }
    }
  }
  const garnishRows = [...garnishMap.values()].sort((a, b) => b.totalQty - a.totalQty)
  if (garnishRows.length) {
    // вставляем блок гарниров сразу после горячих блюд
    const hotIdx = sections.findIndex((s) => s.key === 'hot_main')
    const section: BatchSection = {
      key: 'garnish',
      title: 'ГАРНИРЫ — суммарно',
      rows: garnishRows,
      totalQty: garnishRows.reduce((acc, r) => acc + r.totalQty, 0),
    }
    if (hotIdx >= 0) sections.splice(hotIdx + 1, 0, section)
    else sections.push(section)
  }

  return sections
}

/* ---------- таймеры и форматирование ---------- */

/** Позиции блюда, готовые к выносу (галочки в статусе стола) */
export function readyPieces(o: Order): number {
  return o.items.filter((i) => i.status === 'ready').reduce((acc, i) => acc + i.qty, 0)
}

/** «12:35» — минуты:секунды с момента */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** «12:45» — часы:минуты времени */
export function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «8 мин назад» / «только что» */
export function minutesAgo(ts: number, now = Date.now()): string {
  const min = Math.floor((now - ts) / 60000)
  if (min < 1) return 'только что'
  if (min === 1) return '1 мин назад'
  return `${min} мин назад`
}

export type TimerLevel = 'ok' | 'warn' | 'late'

/** 0–10 мин — норма, 10–20 — внимание, >20 — опоздание */
export function timerLevel(elapsedMs: number): TimerLevel {
  if (elapsedMs < 10 * 60 * 1000) return 'ok'
  if (elapsedMs < 20 * 60 * 1000) return 'warn'
  return 'late'
}

export function pluralDishes(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} блюдо`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} блюда`
  return `${n} блюд`
}

export function pluralPositions(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} позиция`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} позиции`
  return `${n} позиций`
}

export function pluralTables(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} стол`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} стола`
  return `${n} столов`
}

/** Сортировка заказов кухни: ВИП первыми, затем хронология */
export function sortKitchenOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1
    return a.sentAt - b.sentAt
  })
}

export function kitchenStatusText(status: OrderStatus): string {
  switch (status) {
    case 'sent':
      return 'Ждёт подтверждения кухни'
    case 'cooking':
      return 'Готовится'
    case 'ready':
      return 'НА РАЗДАЧЕ — ждёт раннера'
    case 'served':
      return 'Отдано в зал'
  }
}
