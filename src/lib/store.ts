'use client'

import { create } from 'zustand'
import { toast } from 'sonner'
import type {
  Analytics,
  ConnectionState,
  KitchenMode,
  MenuItem,
  Order,
  OrderBrief,
  OutboxEntry,
  Period,
  Screen,
  StatusFilter,
  StatePayload,
  SubmitAck,
  SubmitPayload,
  TableDraft,
  WaiterTab,
} from './types'
import { defaultPeriod, findMenuItem, GARNISH_IDS, TABLES } from './menu'
import { emitAck } from './socket'
import {
  haptic,
  playOrderBeep,
  playReadyChime,
  playResetBlip,
  playSendConfirm,
  playVipOrderBeep,
} from './audio'
import { formatClock, orderPieces, pluralDishes } from './derive'

/* ============================================================
   ВИТАЛИК — глобальный стор: экраны, черновики чеков (зал),
   заказы и аналитика (с сервера), офлайн-очередь, уведомления.
   ============================================================ */

const LS = {
  screen: 'vk:screen',
  drafts: 'vk:drafts',
  outbox: 'vk:outbox',
  state: 'vk:state',
  sound: 'vk:sound',
  kitchenMode: 'vk:kitchen-mode',
  table: 'vk:table',
  waiterTab: 'vk:waiter-tab',
  waiterName: 'vk:waiter-name',
  statusFilter: 'vk:status-filter',
}
const SS = { period: 'vk:period' }

const VALID_TABLE_IDS = new Set(TABLES.map((t) => t.id))

function persistJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* no-op */
  }
}
function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

const FLASH_TTL = 5200

interface AppStore {
  /* --- boot --- */
  hydrated: boolean
  hydrate: () => void

  /* --- навигация --- */
  screen: Screen
  setScreen: (s: Screen) => void

  /* --- соединение и данные сервера --- */
  connection: ConnectionState
  setConnection: (c: ConnectionState) => void
  orders: Order[]
  analytics: Analytics
  ingestState: (p: StatePayload) => void

  /* --- уведомления (звук/тосты по роли экрана) --- */
  onNewOrder: (n: OrderBrief) => void
  onAccepted: (n: OrderBrief) => void
  onReady: (n: OrderBrief) => void
  onServed: (n: OrderBrief) => void
  onReset: () => void

  /* --- официант --- */
  waiterName: string
  setWaiterName: (n: string) => void
  selectedTableId: string
  setSelectedTable: (t: string) => void
  period: Period
  setPeriod: (p: Period) => void
  waiterTab: WaiterTab
  setWaiterTab: (t: WaiterTab) => void
  statusFilter: StatusFilter
  setStatusFilter: (f: StatusFilter) => void

  drafts: Record<string, TableDraft>
  addToDraft: (tableId: string, item: MenuItem, opts?: { garnishId?: string; standalone?: boolean }) => void
  updateDraftQty: (tableId: string, key: string, delta: number) => void
  removeDraftItem: (tableId: string, key: string) => void
  setDraftComment: (tableId: string, key: string, comment: string) => void
  toggleDraftQuickNote: (tableId: string, key: string, note: string) => void
  setDraftVip: (tableId: string, vip: boolean) => void
  setDraftTableNote: (tableId: string, note: string) => void
  clearDraft: (tableId: string) => void

  sending: boolean
  submitDraft: (tableId: string) => Promise<boolean>

  outbox: OutboxEntry[]
  cancelOutboxEntry: (clientOrderId: string) => void
  flushOutbox: () => Promise<void>

  /* --- кухня --- */
  kitchenMode: KitchenMode
  setKitchenMode: (m: KitchenMode) => void
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  /** id заказов «только что пришли» → подсветка тикета, expiry в ms */
  flash: Record<string, number>
  acceptOrder: (orderId: string) => Promise<void>
  readyOrder: (orderId: string) => Promise<void>
  serveOrder: (orderId: string) => Promise<void>
  toggleItem: (itemId: string) => Promise<void>

  /* --- монитор --- */
  resetShift: (pin: string) => Promise<boolean>
}

function draftKeyOf(item: { menuItemId: string; garnishId?: string; standalone?: boolean }): string {
  return `${item.menuItemId}::${item.garnishId ?? ''}::${item.standalone ? 1 : 0}`
}

function sanitizeDrafts(raw: unknown): Record<string, TableDraft> {
  const out: Record<string, TableDraft> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [tableId, value] of Object.entries(raw as Record<string, TableDraft>)) {
    if (!VALID_TABLE_IDS.has(tableId) || !value || !Array.isArray(value.items)) continue
    const items = value.items
      .filter((c) => c && typeof c.menuItemId === 'string' && findMenuItem(c.menuItemId))
      .map((c) => {
        const menuItem = findMenuItem(c.menuItemId)!
        const garnishId =
          typeof c.garnishId === 'string' &&
          GARNISH_IDS.has(c.garnishId) &&
          menuItem.category !== 'ГАРНИРЫ'
            ? c.garnishId
            : undefined
        return {
          key: draftKeyOf({ menuItemId: c.menuItemId, garnishId, standalone: c.standalone }),
          menuItemId: c.menuItemId,
          garnishId,
          name: typeof c.name === 'string' ? c.name : (menuItem?.name ?? c.menuItemId),
          qty: Math.max(1, Math.min(50, Math.floor(Number(c.qty) || 1))),
          comment: typeof c.comment === 'string' ? c.comment.slice(0, 80) : undefined,
          standalone: c.standalone === true,
        }
      })
    out[tableId] = {
      items,
      vip: value.vip === true,
      tableNote: typeof value.tableNote === 'string' ? value.tableNote.slice(0, 140) : '',
    }
  }
  return out
}

function sanitizeOutbox(raw: unknown): OutboxEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is OutboxEntry =>
      e &&
      typeof e === 'object' &&
      typeof e.clientOrderId === 'string' &&
      VALID_TABLE_IDS.has(String(e.tableId)) &&
      Array.isArray(e.items) &&
      e.items.length > 0,
  )
}

function persistOutbox(outbox: OutboxEntry[]) {
  persistJson(LS.outbox, outbox)
}

export const useAppStore = create<AppStore>((set, get) => ({
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return

    let period: Period = defaultPeriod()
    try {
      const ss = sessionStorage.getItem(SS.period)
      if (ss === 'breakfast' || ss === 'lunch') period = ss
    } catch {
      /* no-op */
    }

    // кэш состояния (мгновенная отрисовка офлайн, сервер переопределит)
    const cached = readJson<StatePayload>(LS.state)
    const storedScreen = readJson<Screen>(LS.screen)
    const storedTable = readJson<string>(LS.table)
    const storedWaiterName = readJson<string>(LS.waiterName)

    set({
      hydrated: true,
      screen: storedScreen === 'kitchen' || storedScreen === 'monitor' ? storedScreen : 'waiter',
      orders: cached?.orders ?? [],
      analytics:
        cached?.analytics ??
        { date: '', servedOrders: 0, servedTables: 0, totalDishes: 0, vipOrders: 0, items: [] },
      drafts: sanitizeDrafts(readJson(LS.drafts)),
      outbox: sanitizeOutbox(readJson(LS.outbox)),
      period,
      selectedTableId:
        typeof storedTable === 'string' && VALID_TABLE_IDS.has(storedTable) ? storedTable : 't1',
      kitchenMode: readJson<KitchenMode>(LS.kitchenMode) === 'batch' ? 'batch' : 'tickets',
      soundEnabled: readJson<boolean>(LS.sound) ?? true,
      waiterTab: readJson<WaiterTab>(LS.waiterTab) === 'orders' ? 'orders' : 'menu',
      statusFilter: readJson<StatusFilter>(LS.statusFilter) === 'all' ? 'all' : 'mine',
      waiterName: typeof storedWaiterName === 'string' ? storedWaiterName.slice(0, 40) : '',
    })
  },

  /* ---------------- навигация ---------------- */

  screen: 'waiter',
  setScreen: (screen) => {
    persistJson(LS.screen, screen)
    haptic(8)
    set({ screen })
  },

  /* ---------------- данные сервера ---------------- */

  connection: 'connecting',
  setConnection: (connection) => set({ connection }),

  orders: [],
  analytics: { date: '', servedOrders: 0, servedTables: 0, totalDishes: 0, vipOrders: 0, items: [] },

  ingestState: (p) => {
    const orders = Array.isArray(p?.orders) ? p.orders : []
    const analytics = p?.analytics ?? get().analytics
    persistJson(LS.state, { orders, analytics })
    set({ orders, analytics })
  },

  /* ---------------- уведомления ---------------- */

  onNewOrder: (n) => {
    const state = get()
    if (state.screen === 'kitchen') {
      const flash = { ...state.flash }
      flash[n.orderId] = Date.now() + FLASH_TTL
      set({ flash })
      setTimeout(() => {
        const now = Date.now()
        const cur = get().flash
        const next: Record<string, number> = {}
        let changed = false
        for (const [id, exp] of Object.entries(cur)) {
          if (exp > now) next[id] = exp
          else changed = true
        }
        if (changed) set({ flash: next })
      }, FLASH_TTL + 80)

      if (state.soundEnabled) {
        if (n.isVIP) playVipOrderBeep()
        else playOrderBeep()
      }
      haptic(n.isVIP ? [30, 60, 30, 60, 30] : [25, 60, 25])
      toast.success(
        `${n.isAddendum ? 'Дозаказ' : 'Новый заказ'} · ${n.tableLabel}${n.isVIP ? ' ⚡ ВИП' : ''}`,
        { description: `${n.waiterName} · ${pluralDishes(n.pieces)}` },
      )
    }
  },

  onAccepted: (n) => {
    const state = get()
    if (state.screen !== 'waiter') return
    const mine = !state.waiterName || n.waiterName === state.waiterName
    if (!mine) return
    toast.info(`${n.tableLabel}: шеф принял заказ`, {
      description: `Принят в ${formatClock(Date.now())} · блюда запущены в цеха`,
    })
  },

  onReady: (n) => {
    const state = get()
    if (state.screen === 'waiter') {
      const mine = !state.waiterName || n.waiterName === state.waiterName
      if (!mine) return
      if (state.soundEnabled) playReadyChime()
      haptic([15, 80, 15, 80, 40])
      toast.success(`🟢 ${n.tableLabel} — НА РАЗДАЧЕ!`, {
        description: `Заберите блюда у окна выдачи · ${pluralDishes(n.pieces)}`,
      })
    } else if (state.screen === 'monitor') {
      toast.success(`🟢 ${n.tableLabel} — на раздаче`, { description: `Официант: ${n.waiterName}` })
    }
  },

  onServed: (n) => {
    const state = get()
    if (state.screen !== 'waiter') return
    const mine = !state.waiterName || n.waiterName === state.waiterName
    if (!mine) return
    toast.message(`${n.tableLabel} — отдано в зал ✓`, { description: 'Заказ в архиве стола' })
  },

  onReset: () => {
    playResetBlip()
    haptic([20, 60, 20])
    toast.success('Новая смена открыта', { description: 'Все чеки и счётчики очищены' })
    // чистый лист и локально: черновики и офлайн-очередь — тестовые данные
    try {
      localStorage.removeItem(LS.drafts)
      localStorage.removeItem(LS.outbox)
      localStorage.removeItem(LS.state)
    } catch {
      /* no-op */
    }
    set({
      drafts: {},
      outbox: [],
      orders: [],
      analytics: { date: '', servedOrders: 0, servedTables: 0, totalDishes: 0, vipOrders: 0, items: [] },
    })
  },

  /* ---------------- ОФИЦИАНТ ---------------- */

  waiterName: '',
  setWaiterName: (waiterName) => {
    persistJson(LS.waiterName, waiterName)
    set({ waiterName })
  },

  selectedTableId: 't1',
  setSelectedTable: (selectedTableId) => {
    persistJson(LS.table, selectedTableId)
    haptic(6)
    set({ selectedTableId })
  },

  period: 'lunch',
  setPeriod: (period) => {
    try {
      sessionStorage.setItem(SS.period, period)
    } catch {
      /* no-op */
    }
    set({ period })
  },

  waiterTab: 'menu',
  setWaiterTab: (waiterTab) => {
    persistJson(LS.waiterTab, waiterTab)
    set({ waiterTab })
  },

  statusFilter: 'mine',
  setStatusFilter: (statusFilter) => {
    persistJson(LS.statusFilter, statusFilter)
    set({ statusFilter })
  },

  drafts: {},

  addToDraft: (tableId, item, opts) => {
    const garnishId =
      opts?.garnishId && GARNISH_IDS.has(opts.garnishId) && item.category !== 'ГАРНИРЫ'
        ? opts.garnishId
        : undefined
    const standalone = opts?.standalone === true
    const key = draftKeyOf({ menuItemId: item.id, garnishId, standalone })
    const drafts = { ...get().drafts }
    const draft = drafts[tableId] ?? { items: [], vip: false, tableNote: '' }
    const list = [...draft.items]
    const existing = list.find((c) => c.key === key)
    if (existing) existing.qty = Math.min(50, existing.qty + 1)
    else
      list.push({
        key,
        menuItemId: item.id,
        garnishId,
        name: item.name,
        qty: 1,
        standalone,
      })
    drafts[tableId] = { ...draft, items: list }
    persistJson(LS.drafts, drafts)
    haptic(8)
    set({ drafts })
  },

  updateDraftQty: (tableId, key, delta) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId]
    if (!draft) return
    let list = draft.items.map((c) => (c.key === key ? { ...c, qty: c.qty + delta } : c))
    list = list.filter((c) => c.qty > 0)
    if (list.length) drafts[tableId] = { ...draft, items: list }
    else delete drafts[tableId]
    persistJson(LS.drafts, drafts)
    haptic(6)
    set({ drafts })
  },

  removeDraftItem: (tableId, key) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId]
    if (!draft) return
    const list = draft.items.filter((c) => c.key !== key)
    if (list.length) drafts[tableId] = { ...draft, items: list }
    else delete drafts[tableId]
    persistJson(LS.drafts, drafts)
    haptic(6)
    set({ drafts })
  },

  setDraftComment: (tableId, key, comment) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId]
    if (!draft) return
    const trimmed = comment.trim().slice(0, 80)
    drafts[tableId] = {
      ...draft,
      items: draft.items.map((c) => (c.key === key ? { ...c, comment: trimmed || undefined } : c)),
    }
    persistJson(LS.drafts, drafts)
    set({ drafts })
  },

  toggleDraftQuickNote: (tableId, key, note) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId]
    if (!draft) return
    drafts[tableId] = {
      ...draft,
      items: draft.items.map((c) => {
        if (c.key !== key) return c
        const parts = (c.comment ?? '')
          .split(', ')
          .map((s) => s.trim())
          .filter(Boolean)
        const idx = parts.indexOf(note)
        if (idx >= 0) parts.splice(idx, 1)
        else parts.push(note)
        const merged = parts.join(', ')
        return { ...c, comment: merged || undefined }
      }),
    }
    persistJson(LS.drafts, drafts)
    haptic(6)
    set({ drafts })
  },

  setDraftVip: (tableId, vip) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId] ?? { items: [], vip: false, tableNote: '' }
    drafts[tableId] = { ...draft, vip }
    persistJson(LS.drafts, drafts)
    haptic(10)
    set({ drafts })
  },

  setDraftTableNote: (tableId, tableNote) => {
    const drafts = { ...get().drafts }
    const draft = drafts[tableId] ?? { items: [], vip: false, tableNote: '' }
    drafts[tableId] = { ...draft, tableNote: tableNote.trim().slice(0, 140) }
    persistJson(LS.drafts, drafts)
    set({ drafts })
  },

  clearDraft: (tableId) => {
    const drafts = { ...get().drafts }
    delete drafts[tableId]
    persistJson(LS.drafts, drafts)
    set({ drafts })
  },

  sending: false,

  submitDraft: async (tableId) => {
    const state = get()
    const draft = state.drafts[tableId]
    if (!draft || draft.items.length === 0 || state.sending) return false
    if (!state.waiterName.trim()) {
      toast.error('Выберите имя официанта', { description: 'Кухня должна знать, чей заказ' })
      return false
    }
    const pieces = draft.items.reduce((acc, c) => acc + c.qty, 0)
    const isAddendum = state.orders.some((o) => o.tableId === tableId && o.status !== 'served')
    const tableLabel =
      state.orders.find((o) => o.tableId === tableId)?.tableLabel ?? tableLabelOfSafe(tableId)

    const payload: SubmitPayload = {
      clientOrderId: crypto.randomUUID(),
      tableId,
      waiterName: state.waiterName.trim(),
      isVIP: draft.vip,
      tableNote: draft.tableNote || undefined,
      period: state.period,
      items: draft.items.map(({ menuItemId, garnishId, qty, comment, standalone }) => ({
        menuItemId,
        garnishId,
        qty,
        comment,
        standalone,
      })),
    }

    const queueOffline = () => {
      const outbox = [...get().outbox, { ...payload, queuedAt: Date.now(), tableLabel, pieces }]
      persistOutbox(outbox)
      set({ outbox, waiterTab: 'orders' })
      get().clearDraft(tableId)
      toast.warning('Нет связи с кухней', {
        description: 'Заказ сохранён в телефоне и уйдёт автоматически при подключении',
      })
    }

    set({ sending: true })
    try {
      if (state.connection !== 'online') {
        queueOffline()
        return true
      }
      const res = await emitAck<SubmitAck>('vk:order:submit', payload)
      if (res?.ok) {
        get().clearDraft(tableId)
        playSendConfirm()
        haptic([14, 50, 24])
        toast.success(
          isAddendum ? 'Дозаказ отправлен на кухню' : 'Заказ отправлен! 🟡 Ждёт подтверждения шефа',
          { description: `${tableLabel} · ${pluralDishes(pieces)}${draft.vip ? ' · ⚡ ВИП' : ''}` },
        )
        set({ waiterTab: 'orders' })
        return true
      }
      toast.error('Кухня не приняла заказ', { description: res?.error ?? 'Попробуйте ещё раз' })
      return false
    } catch {
      queueOffline()
      return true
    } finally {
      set({ sending: false })
    }
  },

  outbox: [],

  cancelOutboxEntry: (clientOrderId) => {
    const outbox = get().outbox.filter((e) => e.clientOrderId !== clientOrderId)
    persistOutbox(outbox)
    set({ outbox })
  },

  flushOutbox: async () => {
    const state = get()
    if (!state.outbox.length) return
    const remaining = [...state.outbox]
    for (const entry of remaining) {
      try {
        const res = await emitAck<SubmitAck>('vk:order:submit', entry)
        if (res?.ok) {
          const outbox = get().outbox.filter((e) => e.clientOrderId !== entry.clientOrderId)
          persistOutbox(outbox)
          set({ outbox })
          toast.success(`Заказ доставлен на кухню · ${entry.tableLabel}`, {
            description: 'Связь восстановлена — заказ ушёл из офлайн-очереди',
          })
        } else {
          // сервер отказал (некорректные данные) — убираем, чтобы не крутился вечно
          const outbox = get().outbox.filter((e) => e.clientOrderId !== entry.clientOrderId)
          persistOutbox(outbox)
          set({ outbox })
          toast.error(`Заказ отклонён · ${entry.tableLabel}`, { description: res?.error })
        }
      } catch {
        break // связь снова пропала — попробуем при следующем подключении
      }
    }
  },

  /* ---------------- КУХНЯ ---------------- */

  kitchenMode: 'tickets',
  setKitchenMode: (kitchenMode) => {
    persistJson(LS.kitchenMode, kitchenMode)
    set({ kitchenMode })
  },

  soundEnabled: true,
  setSoundEnabled: (soundEnabled) => {
    persistJson(LS.sound, soundEnabled)
    set({ soundEnabled })
  },

  flash: {},

  acceptOrder: async (orderId) => {
    try {
      const res = await emitAck('vk:order:accept', { orderId })
      if (!res?.ok) toast.error('Не удалось принять заказ', { description: res?.error })
    } catch {
      toast.error('Нет связи с сервером')
    }
  },

  readyOrder: async (orderId) => {
    try {
      const res = await emitAck('vk:order:ready', { orderId })
      if (!res?.ok) toast.error('Не удалось отметить готовность', { description: res?.error })
    } catch {
      toast.error('Нет связи с сервером')
    }
  },

  serveOrder: async (orderId) => {
    try {
      const res = await emitAck('vk:order:serve', { orderId })
      if (!res?.ok) toast.error('Не удалось отдать заказ', { description: res?.error })
    } catch {
      toast.error('Нет связи с сервером')
    }
  },

  toggleItem: async (itemId) => {
    try {
      const res = await emitAck<{ ok: boolean; error?: string }>('vk:item:toggle', { itemId })
      if (!res?.ok && res?.error) toast.error(res.error)
    } catch {
      toast.error('Нет связи с сервером')
    }
  },

  /* ---------------- МОНИТОР ---------------- */

  resetShift: async (pin) => {
    try {
      const res = await emitAck<{ ok: boolean; error?: string }>('vk:shift:reset', { pin })
      if (res?.ok) {
        haptic([20, 60, 20])
        return true
      }
      return false
    } catch {
      toast.error('Нет связи с сервером')
      return false
    }
  },
}))

/* локальный безопасный лейбл стола (без циклического импорта меню в рантайме) */
function tableLabelOfSafe(tableId: string): string {
  const m = /^t(\d+)$/.exec(tableId)
  if (m) return `Стол ${m[1]}`
  if (tableId === 'banquet1') return 'Банкет 1'
  if (tableId === 'banquet2') return 'Банкет 2'
  return tableId
}

/* селектор: активный заказ выбранного стола (для режима дозаказа) */
export function selectActiveOrder(state: { orders: Order[] }, tableId: string): Order | undefined {
  return state.orders.find((o) => o.tableId === tableId && o.status !== 'served')
}

export function selectPieces(state: { orders: Order[] }, orderId: string): number {
  const o = state.orders.find((x) => x.id === orderId)
  return o ? orderPieces(o) : 0
}
