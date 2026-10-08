'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSync } from './sync-provider'
import { ALL_DISHES, shortName } from '@/lib/menu'
import { ageLabel } from '@/lib/format'
import { haptic, playBell, unlockAudio } from '@/lib/bell'
import { ApiError, postJSON } from '@/lib/api'
import type { OrderView } from '@/lib/types'

export function KitchenScreen() {
  const { state, refresh, patch } = useSync()
  const [soundOn, setSoundOn] = useState(false)
  const known = useRef<Set<string> | null>(null)
  const [flash, setFlash] = useState(false)

  // Новый заказ → один чёткий «дзинь»
  useEffect(() => {
    if (!state) return
    const pendingIds = state.orders.filter((o) => o.status === 'pending').map((o) => o.id)
    if (known.current === null) {
      known.current = new Set(pendingIds)
      return
    }
    const fresh = pendingIds.filter((id) => !known.current!.has(id))
    known.current = new Set(pendingIds)
    if (fresh.length === 0) return
    if (soundOn) playBell()
    haptic([120, 80, 120])
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 2600)
    return () => clearTimeout(t)
  }, [state, soundOn])

  async function toggleSound() {
    if (soundOn) {
      setSoundOn(false)
      try {
        window.localStorage.removeItem('vitalik_sound')
      } catch {
        /* no-op */
      }
      return
    }
    const ok = await unlockAudio()
    if (ok) {
      setSoundOn(true)
      try {
        window.localStorage.setItem('vitalik_sound', '1')
      } catch {
        /* no-op */
      }
      playBell()
    } else {
      toast.error('Не удалось включить звук')
    }
  }

  const pending = useMemo(
    () => (state?.orders ?? []).filter((o) => o.status === 'pending'),
    [state],
  )
  const ready = useMemo(() => (state?.orders ?? []).filter((o) => o.status === 'ready'), [state])

  // БЛОК А: сводка — что жарить сейчас (по всем активным заказам)
  const cookNow = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of pending) {
      for (const it of o.items) {
        m.set(it.dish, (m.get(it.dish) ?? 0) + it.qty)
        if (it.garnish) m.set(it.garnish, (m.get(it.garnish) ?? 0) + it.qty)
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [pending])

  const pendingSorted = useMemo(
    () => [...pending].sort((a, b) => (a.vip === b.vip ? a.createdAt - b.createdAt : a.vip ? -1 : 1)),
    [pending],
  )
  const readySorted = useMemo(
    () => [...ready].sort((a, b) => (b.readyAt ?? b.createdAt) - (a.readyAt ?? a.createdAt)),
    [ready],
  )
  const stopped = useMemo(() => new Set(state?.stopped ?? []), [state?.stopped])

  async function markReady(o: OrderView) {
    patch((s) => ({
      ...s,
      orders: s.orders.map((x) =>
        x.id === o.id ? { ...x, status: 'ready' as const, readyAt: Date.now() } : x,
      ),
    }))
    try {
      await postJSON('/api/orders', { action: 'ready', id: o.id })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось — повторите')
    } finally {
      refresh()
    }
  }

  async function archive(o: OrderView) {
    patch((s) => ({ ...s, orders: s.orders.filter((x) => x.id !== o.id) }))
    try {
      await postJSON('/api/orders', { action: 'archive', id: o.id })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось — повторите')
    } finally {
      refresh()
    }
  }

  async function toggleStop(dish: string) {
    const nowStopped = stopped.has(dish)
    patch((s) => ({
      ...s,
      stopped: nowStopped ? s.stopped.filter((d) => d !== dish) : [...s.stopped, dish],
    }))
    try {
      await postJSON('/api/stoplist', { dish, stopped: !nowStopped })
    } catch {
      toast.error('Не удалось изменить стоп-лист')
    } finally {
      refresh()
    }
  }

  if (!state) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-[#1A1E26]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#1A1E26]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#1A1E26]" />
      </div>
    )
  }

  return (
    <div>
      {/* Заголовок + звук */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-white">👨‍🍳 Кухня</h1>
          <p className="text-xs text-zinc-400">
            {pending.length} в работе · {ready.length} к выдаче
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleSound()}
          aria-pressed={soundOn}
          className={`h-12 shrink-0 rounded-xl border px-4 text-sm font-bold transition active:scale-95 ${
            soundOn
              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
              : 'border-[#2A2F3A] bg-[#1A1E26] text-zinc-300'
          }`}
        >
          🔔 {soundOn ? 'Звук вкл' : 'Включить звук'}
        </button>
      </div>

      {/* БЛОК А: СВОДКА — ЧТО ЖАРИТЬ СЕЙЧАС */}
      <section
        aria-label="Сводка"
        className={`mb-5 rounded-2xl border p-4 transition-colors ${
          flash ? 'border-amber-500/70 bg-amber-500/5' : 'border-[#2A2F3A] bg-[#1A1E26]'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Сводка — что жарить сейчас
          </h2>
          {flash && (
            <span role="status" className="animate-pulse text-xs font-bold text-amber-400">
              🔔 Новый заказ!
            </span>
          )}
        </div>
        {cookNow.length === 0 ? (
          <p className="py-2 text-center text-sm text-zinc-400">Активных заказов нет 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cookNow.map(([dish, qty]) => (
              <div
                key={dish}
                className="flex items-center gap-2 rounded-xl border border-[#2A2F3A] bg-[#12141A] px-3.5 py-2.5"
              >
                <span className="text-[15px] font-semibold text-white">{shortName(dish)}</span>
                <span className="text-xl font-black text-emerald-400">{qty}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* БЛОК Б: КАРТОЧКИ ЗАКАЗОВ */}
      <section aria-label="Заказы" className="space-y-3">
        {readySorted.length === 0 && pendingSorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2A2F3A] p-8 text-center">
            <p className="text-2xl">🍳</p>
            <p className="mt-2 text-sm text-zinc-400">Заказов нет. Кухня готова к смене.</p>
          </div>
        )}

        {readySorted.length > 0 && (
          <h2 className="pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            🟢 К выдаче ({readySorted.length})
          </h2>
        )}
        {readySorted.map((o) => (
          <article
            key={o.id}
            className="ready-glow overflow-hidden rounded-2xl border border-emerald-500 bg-emerald-500/10"
          >
            <div className="px-4 pt-4 text-center">
              <p className="text-lg font-black uppercase leading-tight tracking-wide text-emerald-300">
                📢 ЗАБРАТЬ СТОЛ № {o.table} ({o.waiter})
              </p>
              <p className="mt-1 text-xs text-emerald-300/80">
                Готово к выносу · {ageLabel(Math.max(0, state.serverTime - (o.readyAt ?? o.createdAt)))} назад
              </p>
            </div>
            <ul className="px-4 py-3">
              {o.items.map((it, i) => (
                <li key={i} className="text-sm text-zinc-400">
                  <span className="font-bold text-zinc-200">{it.qty}×</span> {it.dish}
                  {it.garnish && <span className="text-zinc-400"> (гарнир: {shortName(it.garnish)})</span>}
                </li>
              ))}
              {o.comment && <li className="mt-1 text-xs text-amber-300/80">💬 «{o.comment}»</li>}
            </ul>
            <div className="p-3 pt-0">
              <button
                type="button"
                onClick={() => void archive(o)}
                className="h-14 w-full rounded-xl border-2 border-emerald-500 text-base font-black uppercase tracking-wide text-emerald-300 transition active:scale-[0.98]"
              >
                🗂 Забрали — в архив
              </button>
            </div>
          </article>
        ))}

        {pendingSorted.length > 0 && (
          <h2 className="pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            🔥 В работе ({pendingSorted.length})
          </h2>
        )}
        {pendingSorted.map((o) => (
          <article
            key={o.id}
            className={`rounded-2xl border bg-[#1A1E26] p-4 ${o.vip ? 'vip-frame' : 'border-[#2A2F3A]'}`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-white">
                  Стол № {o.table}
                  <span className="font-normal text-zinc-400"> · Официант {o.waiter}</span>
                </p>
                {o.vip && <span className="vip-chip mt-1.5">⭐ ВИП</span>}
              </div>
              <TimerChip ms={Math.max(0, state.serverTime - o.createdAt)} />
            </div>
            <ul className="mb-4 space-y-1.5">
              {o.items.map((it, i) => (
                <li key={i} className="text-[15px] leading-snug text-white">
                  <span className="font-black text-emerald-400">{it.qty}×</span> {it.dish}
                  {it.garnish && (
                    <span className="font-normal text-zinc-400"> (гарнир: {shortName(it.garnish)})</span>
                  )}
                </li>
              ))}
              {o.comment && <li className="pt-1 text-sm text-amber-300/90">💬 «{o.comment}»</li>}
            </ul>
            <button
              type="button"
              onClick={() => void markReady(o)}
              className="h-14 w-full rounded-xl bg-emerald-500 text-base font-black uppercase tracking-wide text-[#052016] transition active:scale-[0.98]"
            >
              ✅ Готово к выносу
            </button>
          </article>
        ))}
      </section>

      {/* СТОП-ЛИСТ: 1 клик шефа */}
      <section aria-label="Стоп-лист" className="mt-6 rounded-2xl border border-[#2A2F3A] bg-[#1A1E26] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">🚫 Стоп-лист</h2>
        <p className="mb-3 mt-1 text-xs text-zinc-400">Нажмите на блюдо, чтобы выключить или вернуть позицию</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DISHES.map((d) => {
            const on = stopped.has(d.name)
            return (
              <button
                key={d.name}
                type="button"
                onClick={() => void toggleStop(d.name)}
                aria-pressed={on}
                aria-label={on ? `Снять со стопа: ${d.name}` : `В стоп: ${d.name}`}
                className={`h-11 rounded-full border px-3.5 text-sm font-semibold transition active:scale-95 ${
                  on
                    ? 'border-red-500/70 bg-red-500/15 text-red-400 line-through'
                    : 'border-[#2A2F3A] bg-[#12141A] text-zinc-400'
                }`}
              >
                {on ? '🚫 ' : ''}
                {d.short}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TimerChip({ ms }: { ms: number }) {
  const level =
    ms < 10 * 60000 ? 'text-zinc-400' : ms < 20 * 60000 ? 'text-amber-400' : 'text-red-400'
  return (
    <span
      className={`shrink-0 rounded-lg border border-[#2A2F3A] bg-[#12141A] px-2.5 py-1 text-xs font-bold ${level}`}
    >
      {ageLabel(ms)}
    </span>
  )
}
