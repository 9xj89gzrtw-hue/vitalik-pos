import { COOKS, COURSE_ORDER, findMenuItem } from './menu'
import { cookingOf, queuedOf, readyOf, servedOf } from './types'
import type { CookId, Order, OrderItem } from './types'

/* ============================================================
   ВИТАЛИК v6 — производные структуры: статусы позиций,
   сводка цехов (батчинг), подсказка суфлера, тикеты кухни.
   ============================================================ */

/* ---------- форматирование ---------- */

export function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function pluralPortions(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} порция`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} порции`
  return `${n} порций`
}

export function pluralDishes(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} блюдо`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} блюда`
  return `${n} блюд`
}

/* ---------- статусы позиции (по порциям) ---------- */

export interface PortionChips {
  queued: number
  cooking: number
  ready: number
  served: number
}

export function portionChips(it: OrderItem): PortionChips {
  return {
    queued: queuedOf(it),
    cooking: cookingOf(it),
    ready: readyOf(it),
    served: servedOf(it),
  }
}

/** Агрегированный статус строки для тикетов/зала */
export type ItemPhase = 'queued' | 'cooking' | 'ready' | 'served' | 'mixed'

export function itemPhase(it: OrderItem): ItemPhase {
  const { queued, cooking, ready, served } = portionChips(it)
  if (queued === 0 && cooking === 0 && ready === 0) return 'served'
  if (ready > 0 && queued === 0 && cooking === 0) return 'ready'
  if (queued > 0 && cooking === 0 && ready === 0) return 'queued'
  if (cooking > 0 && queued === 0 && ready === 0) return 'cooking'
  return 'mixed'
}

export const PHASE_META: Record<ItemPhase, { icon: string; label: string; cls: string }> = {
  queued: { icon: '⏳', label: 'В очереди', cls: 'text-zinc-400' },
  cooking: { icon: '🔥', label: 'Готовится', cls: 'text-amber-300' },
  ready: { icon: '🟢', label: 'ГОТОВО НА РАЗДАЧЕ', cls: 'text-emerald-300' },
  served: { icon: '⚪', label: 'Подано', cls: 'text-zinc-500' },
  mixed: { icon: '🔁', label: 'Частично', cls: 'text-amber-200' },
}

/* ---------- сортировка заказов ---------- */

export function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => (b.vip ? 1 : 0) - (a.vip ? 1 : 0) || a.createdAt - b.createdAt,
  )
}

/* ---------- сводка цехов (батчинг) ---------- */

export interface TableBreakdown {
  table: number
  qty: number
  vip: boolean
}

export interface DishGroup {
  menuItemId: string
  name: string
  cook: CookId
  /** есть порции в ВИП-заказах */
  vip: boolean
  total: number
  cooking: number
  queued: number
  cookingTables: TableBreakdown[]
  queuedTables: TableBreakdown[]
}

/** Группировка всех открытых заказов по блюду (для батчинга) */
export function buildDishGroups(orders: Order[]): DishGroup[] {
  const map = new Map<string, DishGroup>()
  for (const o of orders) {
    for (const it of o.items) {
      const dish = findMenuItem(it.menuItemId)
      if (!dish) continue
      let g = map.get(it.menuItemId)
      if (!g) {
        g = {
          menuItemId: it.menuItemId,
          name: it.name,
          cook: dish.cook,
          vip: false,
          total: 0,
          cooking: 0,
          queued: 0,
          cookingTables: [],
          queuedTables: [],
        }
        map.set(it.menuItemId, g)
      }
      const cooking = cookingOf(it)
      const queued = queuedOf(it)
      g.total += it.qty
      g.cooking += cooking
      g.queued += queued
      if (o.vip) g.vip = true
      if (cooking > 0) {
        const ex = g.cookingTables.find((t) => t.table === o.table)
        if (ex) ex.qty += cooking
        else g.cookingTables.push({ table: o.table, qty: cooking, vip: o.vip })
      }
      if (queued > 0) {
        const ex = g.queuedTables.find((t) => t.table === o.table)
        if (ex) ex.qty += queued
        else g.queuedTables.push({ table: o.table, qty: queued, vip: o.vip })
      }
    }
  }
  return [...map.values()].sort(
    (a, b) => b.queued + b.cooking - (a.queued + a.cooking) || (b.vip ? 1 : 0) - (a.vip ? 1 : 0),
  )
}

/** Группы по цехам (попро официантам: Повар 1/2/3) */
export interface CookSection {
  cook: CookId
  title: string
  station: string
  groups: DishGroup[]
  cooking: number
}

export function buildCookSections(orders: Order[]): CookSection[] {
  const groups = buildDishGroups(orders)
  return COOKS.map((c) => {
    const own = groups.filter((g) => g.cook === c.id)
    return {
      cook: c.id,
      title: c.title,
      station: c.station,
      groups: own,
      cooking: own.reduce((acc, g) => acc + g.cooking, 0),
    }
  })
}

/* ---------- умная подсказка суфлера ---------- */

export interface SuflerHint {
  cook: CookId
  cookTitle: string
  station: string
  menuItemId: string
  name: string
  count: number
  tables: number[]
  vip: boolean
}

/**
 * Алгоритм: находим повара без порций «в готовке», среди его блюд —
 * наибольшее скопление неозвученных порций (ВИП-блюда приоритетнее).
 */
export function buildSuflerHint(orders: Order[]): SuflerHint | null {
  const sections = buildCookSections(orders)
  const free = sections.filter((s) => s.cooking === 0)
  if (free.length === 0) return null

  let best: { section: CookSection; group: DishGroup } | null = null
  for (const section of free) {
    for (const group of section.groups) {
      if (group.queued <= 0) continue
      if (
        !best ||
        group.queued > best.group.queued ||
        (group.queued === best.group.queued && group.vip && !best.group.vip)
      ) {
        best = { section, group }
      }
    }
  }
  if (!best) return null

  return {
    cook: best.section.cook,
    cookTitle: best.section.title,
    station: best.section.station,
    menuItemId: best.group.menuItemId,
    name: best.group.name,
    count: best.group.queued,
    tables: best.group.queuedTables.map((t) => t.table).sort((a, b) => a - b),
    vip: best.group.vip,
  }
}

/* ---------- тикеты кухни: курсы с вложенными гарнирами ---------- */

export interface TicketLine {
  item: OrderItem
  garnishes: OrderItem[]
}

export interface TicketCourse {
  title: string
  lines: TicketLine[]
}

export function buildTicketCourses(order: Order): TicketCourse[] {
  const mains = order.items.filter((i) => !i.garnishFor)
  const courses: TicketCourse[] = []
  const categoryOf = (id: string) => findMenuItem(id)?.category ?? ''
  const ordered = [...mains].sort(
    (a, b) =>
      COURSE_ORDER.indexOf(categoryOf(a.menuItemId)) - COURSE_ORDER.indexOf(categoryOf(b.menuItemId)),
  )
  let lastTitle = ''
  for (const item of ordered) {
    const cat = categoryOf(item.menuItemId)
    const title = cat === 'ЗАВТРАКИ' ? 'ЗАВТРАКИ' : cat
    const garnishes = order.items.filter((i) => i.garnishFor === item.menuItemId)
    if (title !== lastTitle) {
      courses.push({ title, lines: [] })
      lastTitle = title
    }
    courses[courses.length - 1].lines.push({ item, garnishes })
  }
  return courses
}

/* ---------- баннеры ВЫНОС для раннеров ---------- */

export interface RunnerBannerData {
  table: number
  waiter: string
  vip: boolean
  dishes: string[]
  portions: number
}

/** Столы, у которых есть готовые к выносу порции */
export function buildRunnerBanners(orders: Order[]): RunnerBannerData[] {
  const out: RunnerBannerData[] = []
  for (const o of sortOrders(orders)) {
    const dishes: string[] = []
    let portions = 0
    for (const it of o.items) {
      const ready = readyOf(it)
      if (ready > 0) {
        dishes.push(`${ready}× ${it.name}`)
        portions += ready
      }
    }
    if (dishes.length > 0) {
      out.push({ table: o.table, waiter: o.waiter, vip: o.vip, dishes, portions })
    }
  }
  return out
}
