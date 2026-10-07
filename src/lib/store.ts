'use client'

import { create } from 'zustand'
import { toast } from 'sonner'
import type {
  CheckItem,
  ConnectionState,
  ItemStatus,
  KitchenMode,
  MenuItem,
  Order,
  Period,
  Role,
  WaiterTab,
} from './types'
import { defaultPeriod, findMenuItem, GARNISH_IDS, TABLES_COUNT } from './menu'
import { emitAck } from './socket'
import { haptic, playOrderBeep, playReadyChime, playSendConfirm } from './audio'

/* ============================================================
   Глобальный стор Пасс: роли, черновики чеков (зал),
   активные заказы (кухня), уведомления.
   ============================================================ */

const LS = {
  role: 'pos:role',
  checks: 'pos:checks',
  sound: 'pos:sound',
  kitchenMode: 'pos:kitchen-mode',
  table: 'pos:table',
  waiterTab: 'pos:waiter-tab',
}
const SS = { period: 'pos:period' }

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

export interface JustSent {
  table: number
  pieces: number
  at: number
}

interface PosState {
  /* --- boot --- */
  hydrated: boolean
  hydrate: () => void

  /* --- role --- */
  role: Role | null
  setRole: (role: Role | null) => void

  /* --- connection & server data --- */
  connection: ConnectionState
  setConnection: (c: ConnectionState) => void
  orders: Order[]
  /** следующий приход состояния — без звуковых эффектов (после реконнекта) */
  silentNext: boolean
  markSyncBoundary: () => void
  ingestState: (orders: Order[], opts?: { silent?: boolean }) => void

  /* --- зал: официант --- */
  selectedTable: number
  setSelectedTable: (t: number) => void
  period: Period
  setPeriod: (p: Period) => void
  search: string
  setSearch: (s: string) => void
  category: string | null
  setCategory: (c: string | null) => void
  /** вкладка экрана официанта: «Меню» (новый заказ) / «Заказы стола» */
  waiterTab: WaiterTab
  setWaiterTab: (t: WaiterTab) => void
  checks: Record<number, CheckItem[]>
  addToCheck: (table: number, item: MenuItem, garnishId?: string) => void
  updateCheckQty: (table: number, key: string, delta: number) => void
  setCheckComment: (table: number, key: string, comment: string) => void
  removeCheckItem: (table: number, key: string) => void
  clearCheck: (table: number) => void
  sending: boolean
  justSent: JustSent | null
  sendCheck: (table: number) => Promise<boolean>

  /* --- кухня --- */
  kitchenMode: KitchenMode
  setKitchenMode: (m: KitchenMode) => void
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  /** id позиций «только что пришли» → подсветка, expiry в ms */
  flash: Record<string, number>
  setItemStatus: (itemIds: string[], status: ItemStatus) => void
  archiveTable: (tableNumber: number) => void
}

const FLASH_TTL = 4200

export const usePosStore = create<PosState>((set, get) => ({
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return
    const storedRole = readJson<Role>(LS.role)
    let checks = readJson<Record<number, CheckItem[]>>(LS.checks) ?? {}
    // санитайз черновиков (+ миграция старой формы без key/garnishId)
    const cleanChecks: Record<number, CheckItem[]> = {}
    for (const [k, v] of Object.entries(checks)) {
      const t = Number(k)
      if (!Number.isInteger(t) || t < 1 || t > TABLES_COUNT || !Array.isArray(v)) continue
      cleanChecks[t] = v
        .filter((c) => c && typeof c.menuItemId === 'string' && Number.isFinite(c.qty) && c.qty > 0)
        .map((c) => {
          const menuItem = findMenuItem(c.menuItemId)
          /* гарнир валиден, только если он из списка и блюдо — не сам гарнир */
          const garnishId =
            typeof c.garnishId === 'string' &&
            GARNISH_IDS.has(c.garnishId) &&
            menuItem &&
            menuItem.category !== 'ГАРНИРЫ'
              ? c.garnishId
              : undefined
          return {
            key: typeof c.key === 'string' && c.key ? c.key : `${c.menuItemId}::${garnishId ?? ''}`,
            menuItemId: c.menuItemId,
            garnishId,
            name: typeof c.name === 'string' ? c.name : (menuItem?.name ?? c.menuItemId),
            qty: Math.floor(c.qty),
            comment: c.comment?.slice(0, 80),
          }
        })
    }
    checks = cleanChecks

    let period: Period = defaultPeriod()
    try {
      const ss = sessionStorage.getItem(SS.period)
      if (ss === 'breakfast' || ss === 'lunch') period = ss
    } catch {
      /* no-op */
    }

    const storedTable = readJson<number>(LS.table)
    set({
      hydrated: true,
      role: storedRole === 'waiter' || storedRole === 'kitchen' ? storedRole : null,
      checks,
      period,
      selectedTable:
        Number.isInteger(storedTable) && (storedTable as number) >= 1 && (storedTable as number) <= TABLES_COUNT
          ? (storedTable as number)
          : 1,
      kitchenMode: readJson<KitchenMode>(LS.kitchenMode) === 'tickets' ? 'tickets' : 'batch',
      soundEnabled: readJson<boolean>(LS.sound) ?? true,
      waiterTab: readJson<WaiterTab>(LS.waiterTab) === 'orders' ? 'orders' : 'menu',
    })
  },

  role: null,
  setRole: (role) => {
    if (role) persistJson(LS.role, role)
    else {
      try {
        localStorage.removeItem(LS.role)
      } catch {
        /* no-op */
      }
    }
    set({ role })
  },

  connection: 'connecting',
  setConnection: (connection) => set({ connection }),

  orders: [],
  silentNext: false,
  markSyncBoundary: () => set({ silentNext: true }),
  ingestState: (incoming, opts) => {
    const orders = Array.isArray(incoming) ? incoming : []
    const state = get()
    const silent = opts?.silent ?? state.silentNext
    const prev = state.orders

    if (!silent && prev.length + orders.length > 0) {
      const prevById = new Map(prev.map((o) => [o.id, o]))
      const newOrders = orders.filter((o) => !prevById.has(o.id))

      if (state.role === 'kitchen' && newOrders.length > 0) {
        const flash: Record<string, number> = { ...state.flash }
        const expiry = Date.now() + FLASH_TTL
        for (const o of newOrders) {
          for (const item of o.items) flash[item.id] = expiry
          const pieces = o.items.reduce((acc, i) => acc + i.qty, 0)
          toast.success(`Новый заказ · Стол ${o.tableNumber} — ${pieces} шт.`, {
            description: o.items.map((i) => i.name).slice(0, 3).join(', '),
          })
        }
        if (state.soundEnabled) playOrderBeep()
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
        }, FLASH_TTL + 60)
      }

      if (state.role === 'waiter') {
        const prevDone = new Set(prev.flatMap((o) => o.items.filter((i) => i.status === 'done').map((i) => i.id)))
        const readyNow = orders.flatMap((o) =>
          o.items
            .filter((i) => i.status === 'done' && !prevDone.has(i.id))
            .map((i) => ({ item: i, table: o.tableNumber })),
        )
        if (readyNow.length > 0) {
          playReadyChime()
          haptic([12, 60, 12])
          const byTable = new Map<number, typeof readyNow>()
          for (const r of readyNow) {
            const list = byTable.get(r.table) ?? []
            list.push(r)
            byTable.set(r.table, list)
          }
          for (const [table, list] of byTable) {
            const names = list.map((r) => `${r.item.name} ×${r.item.qty}`)
            const shown = names.slice(0, 2).join(', ') + (names.length > 2 ? ` и ещё ${names.length - 2}` : '')
            toast.success(`Стол ${table} — готово к подаче`, { description: shown })
          }
        }
      }
    }

    set({ orders, silentNext: false })
  },

  /* ---------------- З А Л ---------------- */

  selectedTable: 1,
  setSelectedTable: (selectedTable) => {
    persistJson(LS.table, selectedTable)
    set({ selectedTable })
  },

  period: 'lunch',
  setPeriod: (period) => {
    try {
      sessionStorage.setItem(SS.period, period)
    } catch {
      /* no-op */
    }
    set({ period, category: null })
  },

  search: '',
  setSearch: (search) => set({ search }),
  category: null,
  setCategory: (category) => set({ category }),

  waiterTab: 'menu',
  setWaiterTab: (waiterTab) => {
    persistJson(LS.waiterTab, waiterTab)
    set({ waiterTab })
  },

  checks: {},
  addToCheck: (table, item, garnishId) => {
    const gid = garnishId && GARNISH_IDS.has(garnishId) ? garnishId : undefined
    const key = `${item.id}::${gid ?? ''}`
    const checks = { ...get().checks }
    const list = [...(checks[table] ?? [])]
    const existing = list.find((c) => c.key === key)
    if (existing) existing.qty += 1
    else list.push({ key, menuItemId: item.id, garnishId: gid, name: item.name, qty: 1 })
    checks[table] = list
    persistJson(LS.checks, checks)
    haptic(8)
    set({ checks })
  },
  updateCheckQty: (table, key, delta) => {
    const checks = { ...get().checks }
    let list = (checks[table] ?? []).map((c) => (c.key === key ? { ...c, qty: c.qty + delta } : c))
    list = list.filter((c) => c.qty > 0)
    if (list.length) checks[table] = list
    else delete checks[table]
    persistJson(LS.checks, checks)
    haptic(6)
    set({ checks })
  },
  setCheckComment: (table, key, comment) => {
    const checks = { ...get().checks }
    const trimmed = comment.trim().slice(0, 80)
    checks[table] = (checks[table] ?? []).map((c) =>
      c.key === key ? { ...c, comment: trimmed || undefined } : c,
    )
    persistJson(LS.checks, checks)
    set({ checks })
  },
  removeCheckItem: (table, key) => {
    const checks = { ...get().checks }
    const list = (checks[table] ?? []).filter((c) => c.key !== key)
    if (list.length) checks[table] = list
    else delete checks[table]
    persistJson(LS.checks, checks)
    haptic(6)
    set({ checks })
  },
  clearCheck: (table) => {
    const checks = { ...get().checks }
    delete checks[table]
    persistJson(LS.checks, checks)
    set({ checks })
  },

  sending: false,
  justSent: null,
  sendCheck: async (table) => {
    const state = get()
    const check = state.checks[table] ?? []
    if (!check.length || state.sending) return false
    set({ sending: true })
    try {
      const res = await emitAck<{ ok: boolean; error?: string }>('pos:order:create', {
        tableNumber: table,
        period: state.period,
        items: check.map(({ menuItemId, garnishId, qty, comment }) => ({
          menuItemId,
          garnishId,
          qty,
          comment,
        })),
      })
      if (res?.ok) {
        get().clearCheck(table)
        playSendConfirm()
        haptic([14, 50, 24])
        set({
          justSent: { table, pieces: check.reduce((a, c) => a + c.qty, 0), at: Date.now() },
          /* сразу показываем, что заказал стол — решает «проблему 1» */
          waiterTab: 'orders',
        })
        setTimeout(() => {
          const js = get().justSent
          if (js && Date.now() - js.at >= 1900) set({ justSent: null })
        }, 2000)
        return true
      }
      toast.error('Кухня не приняла заказ', { description: res?.error ?? 'Попробуйте ещё раз' })
      return false
    } catch {
      toast.error('Нет связи с кухней', { description: 'Заказ не отправлен — проверьте соединение' })
      return false
    } finally {
      set({ sending: false })
    }
  },

  /* ---------------- К У Х Н Я ---------------- */

  kitchenMode: 'batch',
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
  setItemStatus: (itemIds, status) => {
    if (!itemIds.length) return
    emitAck('pos:items:status', { ids: itemIds, status }).catch(() => {
      toast.error('Не удалось обновить статус', { description: 'Нет связи' })
    })
  },
  archiveTable: (tableNumber) => {
    emitAck('pos:order:archive', { tableNumber }).catch(() => {
      toast.error('Не удалось отдать стол', { description: 'Нет связи' })
    })
  },
}))
