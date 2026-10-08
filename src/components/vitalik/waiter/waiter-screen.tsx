'use client'

import { useState } from 'react'
import { MessageSquare, Rocket, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { usePersistedState, useVitalik } from '@/lib/api-client'
import { haptic, playSendConfirm } from '@/lib/audio'
import { ORDER_NOTE_PRESETS, WAITER_NAMES, findMenuItem } from '@/lib/menu'
import { cookingOf, readyOf } from '@/lib/types'
import type { Period, WaiterName, WaiterTab } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUi } from '../ui'
import { DishSheet } from './dish-sheet'
import { MenuTab } from './menu-tab'
import { StatusTab } from './status-tab'
import type { MenuItem } from '@/lib/types'

/* ============================================================
   Экран 1 — ОФИЦИАНТ: шапка (имя, стол 1–12, ⭐ВИП), комментарий
   к заказу, меню с гарнирами и стоп-листом, статус стола, дозаказ.
   ============================================================ */

export interface CartItem {
  menuItemId: string
  qty: number
  comment?: string
  garnishId?: string | null
}

export function WaiterScreen() {
  const { state, mutate, synced } = useVitalik()
  const { waiter, setWaiter, table, setTable, period } = useUi()
  const [tab, setTab] = usePersistedState<WaiterTab>('vitalik_pos_waiter_tab', 'menu')
  const [vip, setVip] = useState(false)
  const [cart, setCart] = usePersistedState<CartItem[]>('vitalik_pos_cart', [])
  const [note, setNote] = usePersistedState<string>('vitalik_pos_note', '')
  const [dishOpen, setDishOpen] = useState<MenuItem | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const orders = state?.orders ?? []
  const order = table != null ? (orders.find((o) => o.table === table) ?? null) : null
  const cartPieces = cart.reduce((acc, c) => acc + c.qty, 0)

  /* --- точки статуса на плитках столов --- */
  const tableDot = (t: number): 'ready' | 'cooking' | 'queued' | null => {
    const o = orders.find((x) => x.table === t)
    if (!o) return null
    if (o.items.some((it) => readyOf(it) > 0)) return 'ready'
    if (o.items.some((it) => cookingOf(it) > 0)) return 'cooking'
    return 'queued'
  }

  /* --- отправка заказа/дозаказа --- */
  const sendOrder = async () => {
    if (!waiter) {
      toast.error('Выберите официанта (Саша / Денис / Вова)')
      return
    }
    if (table == null) {
      toast.error('Выберите стол 1–12')
      return
    }
    if (cart.length === 0) {
      toast.error('Заказ пуст — добавьте блюда')
      return
    }
    setSending(true)
    const res = await mutate('/api/orders', {
      action: 'create',
      table,
      waiter,
      vip,
      comment: note.trim() || null,
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        qty: c.qty,
        comment: c.comment || undefined,
        garnishId: c.garnishId ?? undefined,
      })),
    })
    setSending(false)
    if (res) {
      const isAddendum = res.isAddendum === true
      toast.success(isAddendum ? 'Дозаказ ушёл на кухню ✅' : 'Заказ отправлен на кухню 🚀')
      playSendConfirm()
      haptic(25)
      setCart([])
      setNote('')
      setVip(false)
      setCartOpen(false)
      setTab('status')
    }
  }

  const removeCartLine = (idx: number) => {
    haptic(10)
    setCart(cart.filter((_, i) => i !== idx))
  }

  const decCartLine = (idx: number) => {
    const line = cart[idx]
    if (line.qty <= 1) removeCartLine(idx)
    else setCart(cart.map((c, i) => (i === idx ? { ...c, qty: c.qty - 1 } : c)))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Шапка */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D4AF37]/15 text-lg" aria-hidden>
            🛎
          </span>
          <div className="leading-none">
            <div className="font-logo text-[20px] font-black tracking-tight text-[#D4AF37]">ВИТАЛИК · ЗАЛ</div>
            <div className="mt-1 text-[11px] font-bold text-zinc-500">
              {waiter ? `Официант: ${waiter}` : 'Выберите официанта'}
              {table != null ? ` · Стол ${table}` : ''}
            </div>
          </div>
        </div>
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            synced ? 'bg-emerald-500/70' : 'animate-pulse bg-amber-500/80',
          )}
          title={synced ? 'Синхронизировано' : 'Возобновляем связь…'}
          aria-hidden
        />
      </header>

      {/* Официанты — ровно трое */}
      <div role="radiogroup" aria-label="Официант" className="grid grid-cols-3 gap-2">
        {WAITER_NAMES.map((name) => {
          const active = waiter === name
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setWaiter(name as WaiterName)
                haptic(10)
              }}
              className={cn(
                'h-[52px] rounded-2xl border text-[15px] font-extrabold transition-all active:scale-[0.98]',
                active
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5E29A] shadow-lg shadow-[#D4AF37]/10'
                  : 'border-[#262B35] bg-[#161922] text-zinc-400',
              )}
            >
              {name}
            </button>
          )
        })}
      </div>

      {/* Столы 1–12 */}
      <section aria-label="Столы">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((t) => {
            const active = table === t
            const dot = tableDot(t)
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTable(t)
                  haptic(10)
                }}
                className={cn(
                  'relative h-[52px] rounded-2xl border text-[15px] font-extrabold transition-all active:scale-[0.98]',
                  active
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5E29A]'
                    : 'border-[#262B35] bg-[#161922] text-zinc-300',
                )}
              >
                {t}
                {dot && (
                  <span
                    className={cn(
                      'absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full',
                      dot === 'ready' && 'animate-pulse bg-emerald-500',
                      dot === 'cooking' && 'bg-amber-500',
                      dot === 'queued' && 'bg-zinc-600',
                    )}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ⭐ ВИП + Комментарий к заказу */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#262B35] bg-[#161922] px-4 py-3">
        <label className="flex flex-1 items-center justify-between gap-3">
          <span className={cn('text-[13px] font-extrabold', vip ? 'text-[#F5E29A]' : 'text-zinc-400')}>
            ⭐ ВИП / ЗАКАЗЧИК
          </span>
          <Switch
            checked={vip}
            onCheckedChange={(v) => {
              setVip(v)
              haptic(10)
            }}
            aria-label="ВИП заказ"
            className={cn(
              'data-[state=checked]:bg-[#D4AF37]',
              vip && 'shadow-lg shadow-[#D4AF37]/30',
            )}
          />
        </label>
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className={cn(
            'flex h-[52px] items-center gap-2 rounded-2xl border px-4 text-[13px] font-extrabold transition-all active:scale-[0.98]',
            note.trim()
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              : 'border-[#262B35] bg-[#161922] text-zinc-400',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          {note.trim() ? 'Комментарий ✓' : 'Комментарий'}
        </button>
      </div>

      {/* Вкладки: Меню / Статус стола */}
      <div
        role="tablist"
        aria-label="Вкладки официанта"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-[#262B35] bg-[#161922] p-1"
      >
        {(
          [
            { key: 'menu', label: '🍽 Меню' },
            { key: 'status', label: 'ℹ️ Где мой заказ?' },
          ] as { key: WaiterTab; label: string }[]
        ).map((t) => {
          const selected = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.key)}
              className={cn(
                'h-[52px] rounded-xl text-[14px] font-extrabold transition-all active:scale-[0.98]',
                selected ? 'bg-[#F5F1E8] text-[#0D0F12]' : 'text-zinc-400',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Контент вкладок */}
      {tab === 'menu' ? (
        <MenuTab
          period={period as Period}
          stoplist={state?.stoplist ?? {}}
          cart={cart}
          onDish={(dish) => setDishOpen(dish)}
        />
      ) : (
        <StatusTab
          order={order}
          table={table}
          onAddMore={() => setTab('menu')}
        />
      )}

      {/* Окно добавления блюда (key — сброс состояния при смене блюда) */}
      <DishSheet
        key={dishOpen?.id ?? 'none'}
        dish={dishOpen}
        stoplist={state?.stoplist ?? {}}
        cart={cart}
        onClose={() => setDishOpen(null)}
        onAdd={(item) => {
          const twin = cart.find(
            (c) =>
              c.menuItemId === item.menuItemId &&
              (c.comment ?? '') === (item.comment ?? '') &&
              (c.garnishId ?? '') === (item.garnishId ?? ''),
          )
          if (twin) {
            setCart(
              cart.map((c) =>
                c === twin ? { ...c, qty: Math.min(30, c.qty + item.qty) } : c,
              ),
            )
          } else {
            setCart([...cart, item])
          }
          toast.success(`${findMenuItem(item.menuItemId)?.short} ×${item.qty} — в заказе`)
          setDishOpen(null)
        }}
      />

      {/* Комментарий к заказу */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[520px] rounded-3xl border-[#262B35] bg-[#161922] text-[#F5F1E8]">
          <DialogHeader>
            <DialogTitle className="text-[#F5E29A]">Комментарий к заказу</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {ORDER_NOTE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNote(note.trim() === p ? '' : p)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[13px] font-bold active:scale-[0.97]',
                    note.trim() === p
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-[#262B35] bg-[#0D0F12] text-zinc-400',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: «Детям вперёд», «После тоста»…"
              className="min-h-[90px] border-[#262B35] bg-[#0D0F12] text-[#F5F1E8] placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="h-[52px] rounded-2xl bg-[#D4AF37] text-[16px] font-black text-[#14100A] active:scale-[0.98]"
            >
              Готово
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Корзина — состав заказа перед отправкой */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[520px] rounded-3xl border-[#262B35] bg-[#161922] text-[#F5F1E8]">
          <DialogHeader>
            <DialogTitle className="text-[#F5E29A]">Чек — {table != null ? `Стол ${table}` : 'стол не выбран'}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto nice-scroll pr-1">
            {cart.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">Заказ пуст — добавьте блюда из меню</p>
            )}
            {cart.map((c, idx) => {
              const dish = findMenuItem(c.menuItemId)
              const garn = c.garnishId ? findMenuItem(c.garnishId) : undefined
              return (
                <div
                  key={`${c.menuItemId}-${idx}`}
                  className="flex items-center gap-2 rounded-2xl border border-[#262B35] bg-[#0D0F12] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">
                      {dish?.short ?? c.menuItemId} ×{c.qty}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {garn ? `+ ${garn.short}` : ''}
                      {c.comment ? ` · ${c.comment}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => decCartLine(idx)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-[#262B35] text-lg font-black text-zinc-300 active:scale-95"
                    aria-label="Убрать порцию"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCartLine(idx)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-[#EF4444]/40 text-[#EF4444] active:scale-95"
                    aria-label="Удалить позицию"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            disabled={cart.length === 0 || sending}
            onClick={() => void sendOrder()}
            className="mt-2 flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] text-[16px] font-black text-[#14100A] disabled:opacity-40 active:scale-[0.98]"
          >
            <Send className="h-5 w-5" />
            {sending ? 'Отправляем…' : 'ОТПРАВИТЬ НА КУХНЮ'}
          </button>
        </DialogContent>
      </Dialog>

      {/* Панель корзины над навигацией */}
      {cart.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 px-4">
          <div className="pointer-events-auto mx-auto flex max-w-[520px] items-center gap-2 rounded-2xl border-2 border-[#D4AF37]/70 bg-[#161922]/95 p-2 pl-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="min-w-0 flex-1 text-left"
              aria-label="Открыть состав заказа"
            >
              <div className="text-[14px] font-black text-[#F5E29A]">
                🧾 В заказе: {cart.length} поз. · {cartPieces} порц.
              </div>
              <div className="truncate text-[11px] text-zinc-500">
                {note.trim() ? `💬 ${note.trim()}` : 'Тап — состав и комментарий'}
              </div>
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void sendOrder()}
              className="flex h-[52px] shrink-0 items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 text-[15px] font-black text-[#14100A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-40 active:scale-[0.97]"
            >
              <Rocket className="h-5 w-5" />
              {sending ? '…' : 'ОТПРАВИТЬ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
