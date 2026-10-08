import { MENU, WAITER_NAMES, findMenuItem } from './menu'
import type {
  AppState,
  ClosedCheck,
  Order,
  OrderItem,
  StopList,
  SubmitItemPayload,
  WaiterName,
} from './types'

/* ============================================================
   ВИТАЛИК v6 — серверный in-memory стор (единственный источник
   истины). Все смартфоны опрашивают /api/sync каждые 1.5 с
   и шлют мутации POST-запросами. Никаких сокетов.
   ============================================================ */

const MAX_TABLE = 12
const MAX_QTY_PER_ITEM = 30
const REQ_ID_CACHE_LIMIT = 400
const RESET_PIN = '0000'

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ServerStore {
  state: AppState
  processedReqIds: Set<string>
}

function freshStoplist(): StopList {
  const map: StopList = {}
  for (const dish of MENU) {
    map[dish.id] = { stopped: false, limit: null, remaining: null }
  }
  return map
}

function initialState(): AppState {
  return {
    revision: 1,
    orders: [],
    history: [],
    stoplist: freshStoplist(),
    counters: {},
    ordered: {},
    serverTime: Date.now(),
  }
}

/** globalThis переживает dev-HMR и живёт внутри одного инстанса сервера */
const g = globalThis as unknown as { __vitalikStoreV6?: ServerStore }

export function getStore(): ServerStore {
  if (!g.__vitalikStoreV6) {
    g.__vitalikStoreV6 = { state: initialState(), processedReqIds: new Set() }
  }
  return g.__vitalikStoreV6
}

function bump(state: AppState) {
  state.revision += 1
  state.serverTime = Date.now()
}

let idSeq = 0
function uid(prefix: string) {
  idSeq += 1
  return `${prefix}_${Date.now().toString(36)}${idSeq.toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Идемпотентность мутаций: повтор запроса (мигнул 4G) не задваивает действия */
function rememberReqId(store: ServerStore, reqId: string): boolean {
  if (!reqId || typeof reqId !== 'string') return false
  if (store.processedReqIds.has(reqId)) return true
  store.processedReqIds.add(reqId)
  if (store.processedReqIds.size > REQ_ID_CACHE_LIMIT) {
    const oldest = store.processedReqIds.values().next().value
    if (oldest) store.processedReqIds.delete(oldest)
  }
  return false
}

export function snapshot(state: AppState): AppState {
  return { ...state, serverTime: Date.now() }
}

/* ---------- создание заказа / дозаказ ---------- */

function buildItems(input: SubmitItemPayload[]): OrderItem[] {
  if (!Array.isArray(input) || input.length === 0) throw new ApiError('Заказ пуст')
  const built: OrderItem[] = []
  for (const raw of input) {
    const dish = findMenuItem(String(raw?.menuItemId ?? ''))
    if (!dish) throw new ApiError('Неизвестное блюдо в заказе')
    const qty = Number(raw.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      throw new ApiError(`Неверное количество для «${dish.short}»`)
    }
    const comment = typeof raw.comment === 'string' ? raw.comment.trim().slice(0, 200) : ''

    // гарнир — отдельная позиция (Повар 3), привязанная к блюду
    if (dish.garnishAttachable && raw.garnishId) {
      const garn = findMenuItem(String(raw.garnishId))
      if (!garn || !garn.isGarnish) throw new ApiError('Неверный гарнир')
      built.push({
        id: uid('i'),
        menuItemId: garn.id,
        name: garn.short,
        qty,
        comment: null,
        garnishFor: dish.id,
        announced: 0,
        ready: 0,
        served: 0,
      })
    }
    built.push({
      id: uid('i'),
      menuItemId: dish.id,
      name: dish.short,
      qty,
      comment: comment || null,
      garnishFor: null,
      announced: 0,
      ready: 0,
      served: 0,
    })
  }
  return built
}

function stopGuard(state: AppState, items: OrderItem[]) {
  const usage: Record<string, number> = {}
  for (const it of items) usage[it.menuItemId] = (usage[it.menuItemId] ?? 0) + it.qty

  for (const [mid, qty] of Object.entries(usage)) {
    const entry = state.stoplist[mid]
    const dish = findMenuItem(mid)
    if (!dish || !entry) continue
    if (entry.stopped) {
      throw new ApiError(`«${dish.name}» сейчас в стоп-листе`)
    }
    if (entry.remaining != null && qty > entry.remaining) {
      throw new ApiError(`«${dish.name}»: осталось всего ${entry.remaining} порц.`)
    }
  }
  return usage
}

function applyUsage(state: AppState, usage: Record<string, number>) {
  for (const [mid, qty] of Object.entries(usage)) {
    state.ordered[mid] = (state.ordered[mid] ?? 0) + qty
    const entry = state.stoplist[mid]
    if (!entry) continue
    if (entry.remaining != null) {
      entry.remaining = Math.max(0, entry.remaining - qty)
      if (entry.remaining === 0) entry.stopped = true
    }
  }
}

export function createOrder(
  state: AppState,
  input: {
    table?: number
    waiter?: string
    vip?: boolean
    comment?: string | null
    items?: SubmitItemPayload[]
  },
): { isAddendum: boolean } {
  const waiter = WAITER_NAMES.find((w) => w === input.waiter)
  if (!waiter) throw new ApiError('Выберите официанта (Саша / Денис / Вова)')
  const table = Number(input.table)
  if (!Number.isInteger(table) || table < 1 || table > MAX_TABLE) {
    throw new ApiError('Выберите стол 1–12')
  }

  const built = buildItems(input.items ?? [])
  const usage = stopGuard(state, built)
  applyUsage(state, usage)

  const comment =
    typeof input.comment === 'string' && input.comment.trim() ? input.comment.trim().slice(0, 300) : null

  // дозаказ: у стола уже есть открытый заказ — приклеиваем позиции
  const existing = state.orders.find((o) => o.table === table)
  if (existing) {
    for (const it of built) {
      const twin = existing.items.find(
        (x) =>
          x.menuItemId === it.menuItemId &&
          (x.comment ?? '') === (it.comment ?? '') &&
          (x.garnishFor ?? '') === (it.garnishFor ?? ''),
      )
      if (twin) twin.qty += it.qty
      else existing.items.push(it)
    }
    existing.vip = existing.vip || !!input.vip
    if (comment) existing.comment = comment
    existing.addendumCount += 1
    existing.updatedAt = Date.now()
    existing.acknowledged = false // новые позиции — снова зовём шефа
    bump(state)
    return { isAddendum: true }
  }

  const order: Order = {
    id: uid('o'),
    table,
    waiter,
    vip: !!input.vip,
    comment,
    items: built,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    acknowledged: false,
    addendumCount: 0,
  }
  state.orders.push(order)
  bump(state)
  return { isAddendum: false }
}

/* ---------- приём заказа шефом ---------- */

export function acknowledgeAll(state: AppState) {
  let changed = false
  for (const o of state.orders) {
    if (!o.acknowledged) {
      o.acknowledged = true
      changed = true
    }
  }
  if (changed) bump(state)
}

/* ---------- частичное озвучивание (батчинг) ---------- */

/** Порядок обхода: ВИП первыми, затем по времени создания */
function liveOrdersSorted(state: AppState): Order[] {
  return [...state.orders].sort(
    (a, b) => (b.vip ? 1 : 0) - (a.vip ? 1 : 0) || a.createdAt - b.createdAt,
  )
}

/** Озвучить повару до count порций блюда (FIFO по столам, ВИП вперёд) */
export function announceDish(state: AppState, menuItemId: string, count?: number): number {
  const dish = findMenuItem(menuItemId)
  if (!dish) throw new ApiError('Неизвестное блюдо')
  const need =
    count == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(Number(count)))
  let left = need
  let done = 0
  for (const order of liveOrdersSorted(state)) {
    if (left <= 0) break
    for (const it of order.items) {
      if (left <= 0) break
      if (it.menuItemId !== menuItemId) continue
      const queued = it.qty - it.announced
      if (queued <= 0) continue
      const take = Math.min(queued, left)
      it.announced += take
      left -= take
      done += take
    }
  }
  if (done > 0) bump(state)
  return done
}

/** Отметить готовыми до count порций блюда (FIFO); счётчики «приготовлено» растут тут */
export function readyDish(state: AppState, menuItemId: string, count?: number): number {
  const dish = findMenuItem(menuItemId)
  if (!dish) throw new ApiError('Неизвестное блюдо')
  const need =
    count == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(Number(count)))
  let left = need
  let done = 0
  for (const order of liveOrdersSorted(state)) {
    if (left <= 0) break
    for (const it of order.items) {
      if (left <= 0) break
      if (it.menuItemId !== menuItemId) continue
      const cooking = it.announced - it.ready
      if (cooking <= 0) continue
      const take = Math.min(cooking, left)
      it.ready += take
      left -= take
      done += take
    }
  }
  if (done > 0) {
    state.counters[menuItemId] = (state.counters[menuItemId] ?? 0) + done
    bump(state)
  }
  return done
}

/* ---------- вынос (раннер) ---------- */

/** Отдано раннеру: все готовые порции стола помечаются поданными; чек закрывается */
export function serveTable(state: AppState, table: number): { closed: boolean } {
  const t = Number(table)
  const order = state.orders.find((o) => o.table === t)
  if (!order) throw new ApiError(`Нет открытого заказа по столу ${t}`)
  let servedAny = false
  for (const it of order.items) {
    if (it.ready > it.served) {
      it.served = it.ready
      servedAny = true
    }
  }
  if (!servedAny) throw new ApiError(`По столу ${t} нет блюд на раздаче`)

  const allServed = order.items.every((it) => it.served >= it.qty)
  if (allServed) {
    const check: ClosedCheck = {
      orderId: order.id,
      table: order.table,
      waiter: order.waiter,
      vip: order.vip,
      comment: order.comment,
      items: order.items.map((it) => ({ menuItemId: it.menuItemId, name: it.name, qty: it.qty })),
      createdAt: order.createdAt,
      closedAt: Date.now(),
    }
    state.history.unshift(check)
    state.orders = state.orders.filter((o) => o.id !== order.id)
  } else {
    order.updatedAt = Date.now()
  }
  bump(state)
  return { closed: allServed }
}

/* ---------- стоп-лист и остатки ---------- */

export function setStopped(state: AppState, menuItemId: string, stopped: boolean) {
  const dish = findMenuItem(menuItemId)
  if (!dish) throw new ApiError('Неизвестное блюдо')
  const entry = state.stoplist[menuItemId]
  if (!entry) throw new ApiError('Блюдо не найдено в стоп-листе')
  entry.stopped = !!stopped
  bump(state)
}

export function setLimit(state: AppState, menuItemId: string, limit: number | null) {
  const dish = findMenuItem(menuItemId)
  if (!dish) throw new ApiError('Неизвестное блюдо')
  const entry = state.stoplist[menuItemId]
  if (!entry) throw new ApiError('Блюдо не найдено в стоп-листе')

  if (limit == null) {
    entry.limit = null
    entry.remaining = null
  } else {
    const n = Math.floor(Number(limit))
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      throw new ApiError('Лимит: число от 0 до 999')
    }
    entry.limit = n
    // остаток = лимит минус уже заказанное за смену
    const used = state.ordered[menuItemId] ?? 0
    entry.remaining = Math.max(0, n - used)
    if (entry.remaining === 0) entry.stopped = true
  }
  bump(state)
}

/* ---------- сброс смены ---------- */

export function resetShift(state: AppState, pin: string): void {
  if (String(pin ?? '').trim() !== RESET_PIN) {
    throw new ApiError('Неверный PIN-код')
  }
  state.orders = []
  state.history = []
  state.counters = {}
  state.ordered = {}
  state.stoplist = freshStoplist()
  bump(state)
}

/* ---------- диспетчер мутаций (единая точка входа роутов) ---------- */

export function applyOrdersAction(
  store: ServerStore,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const reqId = String(body.reqId ?? '')
  if (rememberReqId(store, reqId)) {
    // повтор уже обработанного запроса — просто отдаём состояние
    return { duplicate: true }
  }
  const state = store.state
  switch (body.action) {
    case 'create':
      return createOrder(state, body as never) as never as Record<string, unknown>
    case 'acknowledge':
      acknowledgeAll(state)
      return {}
    case 'announce':
      return { announced: announceDish(state, String(body.menuItemId ?? ''), body.count as number | undefined) }
    case 'ready':
      return { marked: readyDish(state, String(body.menuItemId ?? ''), body.count as number | undefined) }
    case 'served':
      return serveTable(state, Number(body.table))
    default:
      throw new ApiError(`Неизвестное действие: ${String(body.action)}`)
  }
}

export function applyStoplistAction(
  store: ServerStore,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const reqId = String(body.reqId ?? '')
  if (rememberReqId(store, reqId)) return { duplicate: true }
  const state = store.state
  switch (body.action) {
    case 'setStopped':
      setStopped(state, String(body.menuItemId ?? ''), !!body.stopped)
      return {}
    case 'setLimit':
      setLimit(state, String(body.menuItemId ?? ''), (body.limit as number | null) ?? null)
      return {}
    default:
      throw new ApiError(`Неизвестное действие: ${String(body.action)}`)
  }
}
