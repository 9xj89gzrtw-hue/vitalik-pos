'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSync } from './sync-provider'
import { portionsLabel, ordersLabel } from '@/lib/format'
import { ApiError, postJSON } from '@/lib/api'

export function SummaryScreen() {
  const { state, refresh } = useSync()
  const [pinOpen, setPinOpen] = useState(false)

  const counters = useMemo(
    () => (state?.counters ?? []).filter((c) => c.qty > 0),
    [state],
  )
  const maxQty = counters.reduce((m, c) => Math.max(m, c.qty), 1)

  if (!state) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-[#1A1E26]" />
        <div className="h-16 animate-pulse rounded-xl bg-[#1A1E26]" />
        <div className="h-16 animate-pulse rounded-xl bg-[#1A1E26]" />
      </div>
    )
  }

  const pendingN = state.orders.filter((o) => o.status === 'pending').length
  const readyN = state.orders.filter((o) => o.status === 'ready').length

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-white">📊 Сводка за день</h1>

      {/* Итоги смены */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        <StatTile value={state.stats.totalOrders} label={ordersLabel(state.stats.totalOrders)} />
        <StatTile value={state.stats.totalPortions} label="порций всего" />
        <StatTile value={pendingN} label="готовится" tone="amber" />
        <StatTile value={readyN} label="к выдаче" tone="emerald" />
      </div>

      {/* Счётчик порций каждого блюда */}
      <section aria-label="Отдано за смену">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Отдано за смену
        </h2>
        {counters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2A2F3A] p-8 text-center">
            <p className="text-2xl">🍽</p>
            <p className="mt-2 text-sm text-zinc-400">Пока ничего не заказано</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {counters.map((c) => (
              <li key={c.dish} className="rounded-xl border border-[#2A2F3A] bg-[#1A1E26] px-4 py-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium leading-snug text-white">{c.dish}</span>
                  <span className="shrink-0 text-base font-black text-emerald-400">
                    {portionsLabel(c.qty)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#12141A]">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${Math.max(4, (c.qty / maxQty) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Сброс смены */}
      <button
        type="button"
        onClick={() => setPinOpen(true)}
        className="mt-6 h-14 w-full rounded-xl border border-red-500/50 bg-red-500/10 text-base font-black uppercase tracking-wide text-red-400 transition active:scale-[0.98]"
      >
        🗑 Очистить смену
      </button>
      <p className="mt-2 text-center text-xs text-zinc-400">Понадобится PIN</p>

      {pinOpen && (
        <PinDialog
          onClose={() => setPinOpen(false)}
          onDone={() => {
            setPinOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function StatTile({
  value,
  label,
  tone = 'default',
}: {
  value: number
  label: string
  tone?: 'default' | 'amber' | 'emerald'
}) {
  const color =
    tone === 'amber' ? 'text-amber-400' : tone === 'emerald' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="rounded-xl border border-[#2A2F3A] bg-[#1A1E26] px-2 py-3 text-center">
      <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1.5 text-[10px] leading-tight text-zinc-400">{label}</p>
    </div>
  )
}

/* ---------- Диалог ПИН (0000) ---------- */

function PinDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(value: string) {
    setBusy(true)
    try {
      await postJSON('/api/reset', { pin: value }, 0)
      toast.success('Смена очищена ✨')
      onDone()
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setPin('')
        setError(true)
        setTimeout(() => setError(false), 600)
      } else {
        toast.error('Нет связи — попробуйте ещё раз')
      }
    } finally {
      setBusy(false)
    }
  }

  function press(d: string) {
    if (busy) return
    const next = (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="PIN для очистки смены"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className={`w-full max-w-xs rounded-3xl border border-[#2A2F3A] bg-[#1A1E26] p-5 pb-4 ${
          error ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) onClose()
        }}
      >
        <h3 className="text-center text-base font-bold text-white">Очистить смену?</h3>
        <p className="mt-1 text-center text-xs leading-relaxed text-zinc-400">
          Заказы, счётчики и стоп-лист будут сброшены
        </p>

        <div className="my-5 flex justify-center gap-3.5" aria-label={`Введено ${pin.length} из 4 цифр`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                error
                  ? 'border-red-500'
                  : pin.length > i
                    ? 'border-emerald-400 bg-emerald-400'
                    : 'border-[#2A2F3A]'
              }`}
            />
          ))}
        </div>
        {error && <p className="mb-3 text-center text-sm font-semibold text-red-400">Неверный PIN</p>}

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              disabled={busy}
              onClick={() => press(d)}
              className="h-14 rounded-xl border border-[#2A2F3A] bg-[#12141A] text-xl font-bold text-white transition active:scale-95 disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            disabled={busy}
            onClick={() => press('0')}
            className="h-14 rounded-xl border border-[#2A2F3A] bg-[#12141A] text-xl font-bold text-white transition active:scale-95 disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={busy || pin.length === 0}
            onClick={() => setPin(pin.slice(0, -1))}
            aria-label="Стереть цифру"
            className="h-14 rounded-xl border border-[#2A2F3A] bg-[#12141A] text-xl font-bold text-zinc-400 transition active:scale-95 disabled:opacity-40"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 h-11 w-full rounded-xl text-sm font-semibold text-zinc-400 transition hover:text-zinc-200 disabled:opacity-40"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
