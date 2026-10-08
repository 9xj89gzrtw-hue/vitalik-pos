'use client'

import { create } from 'zustand'

export type CartLine = { dish: string; garnish?: string; qty: number }

const WAITER_KEY = 'vitalik_waiter'

type VitalikState = {
  waiter: string | null
  table: number | null
  vip: boolean
  cart: CartLine[]
  quick: string[]
  note: string
  hydrated: boolean
  setWaiter: (w: string) => void
  setTable: (t: number | null) => void
  setVip: (v: boolean) => void
  addItem: (dish: string, garnish?: string) => void
  decItem: (dish: string, garnish?: string) => void
  clearLine: (dish: string, garnish?: string) => void
  removeDishes: (dishes: string[]) => void
  clearCart: () => void
  toggleQuick: (q: string) => void
  setNote: (s: string) => void
  /** после успешной отправки: корзина и комментарий чистые */
  resetOrderState: () => void
  hydrate: () => void
}

function findIndex(cart: CartLine[], dish: string, garnish?: string): number {
  return cart.findIndex((l) => l.dish === dish && (l.garnish ?? '') === (garnish ?? ''))
}

export const useVitalik = create<VitalikState>((set, get) => ({
  waiter: null,
  table: null,
  vip: false,
  cart: [],
  quick: [],
  note: '',
  hydrated: false,

  setWaiter: (w) => {
    try {
      window.localStorage.setItem(WAITER_KEY, w)
    } catch {
      /* no-op */
    }
    set({ waiter: w })
  },

  setTable: (t) => set({ table: t }),
  setVip: (v) => set({ vip: v }),

  addItem: (dish, garnish) =>
    set((s) => {
      const idx = findIndex(s.cart, dish, garnish)
      if (idx >= 0) {
        const cart = [...s.cart]
        cart[idx] = { ...cart[idx], qty: cart[idx].qty + 1 }
        return { cart }
      }
      return { cart: [...s.cart, { dish, garnish, qty: 1 }] }
    }),

  decItem: (dish, garnish) =>
    set((s) => {
      const idx = findIndex(s.cart, dish, garnish)
      if (idx < 0) return s
      const line = s.cart[idx]
      const cart = [...s.cart]
      if (line.qty <= 1) cart.splice(idx, 1)
      else cart[idx] = { ...line, qty: line.qty - 1 }
      return { cart }
    }),

  clearLine: (dish, garnish) =>
    set((s) => ({ cart: s.cart.filter((_, i) => i !== findIndex(s.cart, dish, garnish)) })),

  removeDishes: (dishes) =>
    set((s) => {
      const banned = new Set(dishes)
      return { cart: s.cart.filter((l) => !banned.has(l.dish) && !banned.has(l.garnish ?? '')) }
    }),

  clearCart: () => set({ cart: [] }),

  toggleQuick: (q) =>
    set((s) => ({
      quick: s.quick.includes(q) ? s.quick.filter((x) => x !== q) : [...s.quick, q],
    })),

  setNote: (v) => set({ note: v }),

  resetOrderState: () => set({ cart: [], quick: [], note: '' }),

  hydrate: () => {
    if (get().hydrated) return
    let w: string | null = null
    try {
      w = window.localStorage.getItem(WAITER_KEY)
    } catch {
      /* no-op */
    }
    set({ waiter: w, hydrated: true })
  },
}))
