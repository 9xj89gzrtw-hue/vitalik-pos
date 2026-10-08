'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useSync } from './sync-provider'
import { useVitalik } from '@/lib/store'
import { GARNISH_OPTIONS, MENU, TABLES, WAITERS, isHotDish, shortName } from '@/lib/menu'
import { dishesLabel } from '@/lib/format'
import { ApiError, postJSON } from '@/lib/api'

const QUICK_COMMENTS = ['Без лука', 'Детям']

export function WaiterScreen() {
  const { state, refresh } = useSync()
  const { waiter, table, vip, cart, quick, note } = useVitalik()
  const { setWaiter, setTable, setVip, addItem, decItem, clearCart, removeDishes, resetOrderState, toggleQuick, setNote } =
    useVitalik()
  const [sending, setSending] = useState(false)
  const plaquesRef = useRef<HTMLDivElement>(null)

  const stopped = useMemo(() => new Set(state?.stopped ?? []), [state?.stopped])
  const dishCount = cart.reduce((s, l) => s + l.qty, 0)
  const comment = [...quick, note.trim()].filter(Boolean).join('. ')

  // Плашки «Где мой заказ»: готовые — сверху, затем свежие
  const myOrders = useMemo(() => {
    if (!state || !waiter) return []
    return state.orders
      .filter((o) => o.waiter === waiter)
      .sort((a, b) =>
        a.status === b.status ? b.createdAt - a.createdAt : a.status === 'ready' ? -1 : 1,
      )
  }, [state, waiter])

  async function send() {
    if (!waiter || !table || dishCount === 0 || sending) return
    setSending(true)
    const sentTable = table
    try {
      await postJSON('/api/orders', {
        action: 'create',
        table: sentTable,
        waiter,
        vip,
        items: cart.map((l) => ({ dish: l.dish, qty: l.qty, garnish: l.garnish })),
        comment: comment || null,
      })
      resetOrderState()
      refresh()
      toast.success(`Стол ${sentTable} отправлен на кухню · Готовится 🔥`)
      setTimeout(() => plaquesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 200)
    } catch (e) {
      if (e instanceof ApiError && e.payload && Array.isArray(e.payload.stopped)) {
        const names = e.payload.stopped as string[]
        removeDishes(names)
        toast.error(`Убрано из заказа (в стоп-листе): ${names.map(shortName).join(', ')}`)
        refresh()
      } else if (e instanceof ApiError) {
        toast.error(e.message)
      } else {
        toast.error('Заказ не отправлен — попробуйте ещё раз')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h1 className="sr-only">Официант</h1>
      {/* КТО ТЫ */}
      <section aria-label="Официант" className="mb-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Кто ты</h2>
        <div className="grid grid-cols-3 gap-2">
          {WAITERS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWaiter(w)}
              aria-pressed={waiter === w}
              className={`h-12 rounded-xl border text-base font-semibold transition active:scale-95 ${
                waiter === w
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                  : 'border-[#2A2F3A] bg-[#1A1E26] text-zinc-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </section>

      {/* СТОЛ + ВИП */}
      <section aria-label="Стол" className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Стол</h2>
          <button
            type="button"
            onClick={() => setVip(!vip)}
            aria-pressed={vip}
            className={`h-12 rounded-full border px-5 text-sm font-bold transition active:scale-95 ${
              vip
                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-[#2A2F3A] bg-[#1A1E26] text-zinc-400'
            }`}
          >
            ⭐ ВИП
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {TABLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTable(table === t ? null : t)}
              aria-pressed={table === t}
              className={`h-12 rounded-xl border text-base font-bold transition active:scale-95 ${
                table === t
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                  : 'border-[#2A2F3A] bg-[#1A1E26] text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* КОММЕНТАРИЙ */}
      <section aria-label="Комментарий" className="mb-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Комментарий</h2>
        <div className="mb-2 flex gap-2">
          {QUICK_COMMENTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => toggleQuick(q)}
              aria-pressed={quick.includes(q)}
              className={`h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${
                quick.includes(q)
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-[#2A2F3A] bg-[#1A1E26] text-zinc-400'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="Свой комментарий…"
          className="h-11 w-full rounded-xl border-[#2A2F3A] bg-[#1A1E26] text-[15px] text-white placeholder:text-zinc-400"
        />
      </section>

      {/* МЕНЮ */}
      {MENU.map((cat) => (
        <section key={cat.category} aria-label={cat.category} className="mb-5">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {cat.category}
          </h2>
          <div className="space-y-2">
            {cat.dishes.map((d) => {
              const isStopped = stopped.has(d.name)
              const inCart = cart.filter((l) => l.dish === d.name).reduce((s, l) => s + l.qty, 0)
              return (
                <div
                  key={d.name}
                  className={`flex min-h-[56px] items-center gap-2 rounded-2xl border px-3 py-2 ${
                    isStopped
                      ? 'border-[#2A2F3A]/60 bg-[#16181F] opacity-50'
                      : 'border-[#2A2F3A] bg-[#1A1E26]'
                  }`}
                >
                  <button
                    type="button"
                    disabled={isStopped}
                    onClick={() => addItem(d.name)}
                    aria-label={`Добавить: ${d.name}`}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left disabled:cursor-not-allowed"
                  >
                    <span className="min-w-0 text-[15px] font-medium leading-snug text-white">{d.name}</span>
                    {inCart > 0 && (
                      <span className="ml-auto mr-1 shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                        ×{inCart}
                      </span>
                    )}
                  </button>
                  {isStopped ? (
                    <span className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400">
                      🚫 В СТОПЕ
                    </span>
                  ) : isHotDish(d.name) ? (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {GARNISH_OPTIONS.map((g) => (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() => addItem(d.name, g.name)}
                          aria-label={`${d.name} с гарниром: ${g.name}`}
                          className="min-h-[44px] rounded-lg border border-[#2A2F3A] bg-[#12141A] px-2.5 text-xs font-semibold text-zinc-300 transition hover:border-emerald-500/50 hover:text-emerald-300 active:scale-95"
                        >
                          +{g.short}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* ПЛАШКИ: ГДЕ МОЙ ЗАКАЗ */}
      <div ref={plaquesRef}>
        {myOrders.length > 0 && (
          <section aria-label="Мои заказы" className="mb-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Мои столы
            </h2>
            <div className="nice-scroll max-h-44 space-y-2 overflow-y-auto pr-1">
              {myOrders.map((o) =>
                o.status === 'ready' ? (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-300"
                  >
                    <span>Стол {o.table} ГОТОВ К ВЫНОСУ! ✅</span>
                    <span className="text-xs font-semibold text-emerald-300/80">забери с раздачи</span>
                  </div>
                ) : (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2F3A] bg-[#1A1E26] px-4 py-3 text-sm text-zinc-200"
                  >
                    <span>Стол {o.table} · Готовится 🔥</span>
                    <span className="text-xs text-zinc-400">
                      {dishesLabel(o.items.reduce((s, i) => s + i.qty, 0))}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        )}
      </div>

      {/* КОРЗИНА + ОТПРАВКА (липкая панель над навигацией) */}
      {dishCount > 0 && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-2 rounded-2xl border border-[#2A2F3A] bg-[#1A1E26]/95 p-3 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300">🛒 {dishesLabel(dishCount)}</span>
            <button
              type="button"
              onClick={clearCart}
              className="-mr-2 flex h-11 items-center rounded-lg px-3 text-xs font-medium text-zinc-400 underline-offset-2 transition hover:text-red-400"
            >
              очистить
            </button>
          </div>
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {cart.map((l) => (
              <button
                key={`${l.dish}|${l.garnish ?? ''}`}
                type="button"
                onClick={() => decItem(l.dish, l.garnish)}
                title="Нажмите, чтобы убрать одну порцию"
                aria-label={`Убрать одну порцию: ${l.dish}${l.garnish ? ` с гарниром ${shortName(l.garnish)}` : ''}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#2A2F3A] bg-[#12141A] px-3 py-2 text-xs text-zinc-300 transition active:scale-95"
              >
                <span className="font-bold text-emerald-300">{l.qty}×</span>
                <span>
                  {shortName(l.dish)}
                  {l.garnish ? ` · ${shortName(l.garnish)}` : ''}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!table || !waiter || sending}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-emerald-500 text-base font-black uppercase tracking-wide text-[#052016] transition active:scale-[0.98] disabled:opacity-50 select-none"
          >
            {sending ? 'ОТПРАВЛЯЕМ…' : `ОТПРАВИТЬ НА КУХНЮ (${dishesLabel(dishCount)})`}
          </button>
          {(!waiter || !table) && (
            <p className="mt-2 text-center text-xs text-amber-400/90">
              {!waiter ? 'Выберите, кто вы' : 'Выберите стол'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
