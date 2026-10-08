'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Crown, FileClock, History, PieChart, ReceiptText, RotateCcw, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { findMenuItem } from '@/lib/menu'
import { formatClock, orderPieces, pluralDishes, servedToday } from '@/lib/derive'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ConnectionBadge } from '../connection-badge'
import { useNow } from '../use-now'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

/* ============================================================
   ЭКРАН 3 — «АНАЛИТИКА И ИСТОРИЯ» (открыт всем, без паролей):
   1) счётчик блюд за день по категориям
   2) журнал истории чеков
   3) сброс тестовых данных (пин 0000)
   ============================================================ */

const CATEGORY_ORDER: { key: string; title: string; hint?: string }[] = [
  { key: 'Завтраки', title: 'ЗАВТРАК' },
  { key: 'САЛАТЫ', title: 'САЛАТЫ' },
  { key: 'ГОРЯЧИЕ ЗАКУСКИ', title: 'ГОРЯЧИЕ ЗАКУСКИ' },
  { key: 'ГОРЯЧИЕ БЛЮДА', title: 'ГОРЯЧИЕ БЛЮДА' },
  { key: 'ГАРНИРЫ', title: 'ГАРНИРЫ', hint: 'включая гарниры к блюдам' },
  { key: 'ДЕСЕРТЫ', title: 'ДЕСЕРТЫ' },
]

function formatDateRu(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return date
  return `${d}.${m}.${y}`
}

function SummaryCard({ icon: Icon, value, label, accent }: {
  icon: typeof BarChart3
  value: number
  label: string
  accent: 'gold' | 'emerald' | 'amber' | 'coral'
}) {
  const accents: Record<'gold' | 'emerald' | 'amber' | 'coral', string> = {
    gold: 'text-[#D4AF37] bg-[#D4AF37]/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    coral: 'text-red-400 bg-red-500/10',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#262B35] bg-[#161922] p-3">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', accents[accent])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-xl font-black tabular-nums text-[#F5F1E8]">{value}</div>
        <div className="text-[9.5px] font-bold uppercase leading-[1.25] tracking-wide text-zinc-500">{label}</div>
      </div>
    </div>
  )
}

/* ---------- журнал истории ---------- */

function HistoryCard({ order, now }: { order: Order; now: number }) {
  const servedAt = order.servedAt ?? order.readyAt ?? order.sentAt
  const minutesAgo = Math.max(0, Math.floor((now - servedAt) / 60000))
  const agoText = minutesAgo < 1 ? 'только что' : `${minutesAgo} мин назад`
  return (
    <article
      className={cn(
        'rounded-2xl border p-4',
        order.isVIP ? 'vip-frame' : 'border-[#262B35] bg-[#161922]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-black text-[#F5F1E8]">{order.tableLabel}</span>
        {order.isVIP && <span className="vip-chip">⭐ ВИП</span>}
        <span className="rounded-full bg-[#232936] px-2.5 py-1 text-[10px] font-bold text-zinc-300">
          {order.waiterName}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-bold tabular-nums text-emerald-400">
          <FileClock className="h-3.5 w-3.5" />
          {formatClock(servedAt)}
        </span>
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        отдано {agoText} · {pluralDishes(orderPieces(order))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="text-[13px] leading-snug">
            <span className="font-black text-emerald-300">{item.qty}×</span>{' '}
            <span className="text-[#F5F1E8]">{item.name}</span>
            {item.garnishName && (
              <span className="ml-1 text-[11px] text-zinc-500">+ {item.garnishName}</span>
            )}
            {item.comment && <span className="ml-1 text-[11px] italic text-amber-400/80">«{item.comment}»</span>}
          </li>
        ))}
      </ul>
    </article>
  )
}

/* ---------- сброс смены ---------- */

function ResetSection() {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const resetShift = useAppStore((s) => s.resetShift)

  const submit = async () => {
    if (pin.length < 4 || busy) return
    setBusy(true)
    const ok = await resetShift(pin)
    setBusy(false)
    if (ok) {
      setOpen(false)
      setPin('')
      setError(false)
    } else {
      setError(true)
      setTimeout(() => setError(false), 600)
    }
  }

  return (
    <section aria-labelledby="analytics-reset" className="mt-6">
      <h2 id="analytics-reset" className="sr-only">
        Сброс тестовых данных
      </h2>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setPin('')
          setError(false)
        }}
        className="flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 text-[15px] font-black uppercase tracking-wide text-red-400 transition-transform active:scale-[0.98]"
      >
        <Trash2 className="h-5 w-5" />
        Сбросить тестовые данные и начать смену
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px] rounded-3xl border-[#262B35] bg-[#161922] p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-[#F5F1E8]">
              Защита пин-кодом
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-zinc-500">
              Введите пин-код администратора для сброса заказов, счётчиков и истории
            </DialogDescription>
          </DialogHeader>

          <div className={cn('flex flex-col items-center gap-3 py-2', error && 'animate-shake')}>
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={setPin}
              inputMode="numeric"
              onComplete={() => void submit()}
              aria-label="Пин-код"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 border-[#262B35] text-lg font-black text-[#F5F1E8]" />
                <InputOTPSlot index={1} className="h-12 w-12 border-[#262B35] text-lg font-black text-[#F5F1E8]" />
                <InputOTPSlot index={2} className="h-12 w-12 border-[#262B35] text-lg font-black text-[#F5F1E8]" />
                <InputOTPSlot index={3} className="h-12 w-12 border-[#262B35] text-lg font-black text-[#F5F1E8]" />
              </InputOTPGroup>
            </InputOTP>
            {error && (
              <p className="text-center text-xs font-bold text-red-400">Неверный пин-код. Попробуйте ещё раз</p>
            )}
          </div>

          <DialogFooter className="flex-col gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={pin.length < 4 || busy}
              className="h-[52px] w-full rounded-2xl bg-red-500 text-[15px] font-black uppercase tracking-wide text-white transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Подтвердить сброс
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[52px] w-full rounded-2xl border border-[#262B35] bg-[#232936] text-sm font-bold text-zinc-300 transition-transform active:scale-[0.98]"
            >
              Отмена
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/* ---------- главный экран ---------- */

export function AnalyticsScreen() {
  const analytics = useAppStore((s) => s.analytics)
  const orders = useAppStore((s) => s.orders)
  const connection = useAppStore((s) => s.connection)
  const now = useNow(15000)

  const history = useMemo(
    () => servedToday(orders).sort((a, b) => (b.servedAt ?? 0) - (a.servedAt ?? 0)),
    [orders],
  )

  // группировка счётчиков по категориям меню
  const grouped = useMemo(() => {
    const buckets = new Map<string, { name: string; qty: number }[]>()
    for (const cat of CATEGORY_ORDER) buckets.set(cat.key, [])
    for (const item of analytics.items) {
      const category = findMenuItem(item.menuItemId)?.category
      const list = category ? buckets.get(category) : undefined
      if (list) list.push({ name: item.name, qty: item.qty })
    }
    for (const [, list] of buckets) list.sort((a, b) => b.qty - a.qty)
    return CATEGORY_ORDER.map((cat) => ({ ...cat, items: buckets.get(cat.key) ?? [] })).filter(
      (g) => g.items.length > 0,
    )
  }, [analytics.items])

  const hasCounters = analytics.orderedDishes > 0

  return (
    <main className="pb-2">
      {/* шапка */}
      <header className="flex items-center gap-3 rounded-3xl border border-[#262B35] bg-[#161922] p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#D4AF37]/15">
          <BarChart3 className="h-6 w-6 text-[#D4AF37]" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight text-[#F5F1E8]">Аналитика и История</h1>
          <p className="text-[11px] font-semibold text-zinc-500">
            Смена: {formatDateRu(analytics.date) || 'сегодня'}
          </p>
        </div>
        <ConnectionBadge connection={connection} />
      </header>

      {/* сводка дня */}
      <section aria-label="Сводка дня" className="mt-4 grid grid-cols-2 gap-2.5">
        <SummaryCard icon={PieChart} value={analytics.orderedDishes} label="Блюд заказано" accent="emerald" />
        <SummaryCard icon={ReceiptText} value={analytics.servedOrders} label="Чеков отдано" accent="amber" />
        <SummaryCard icon={BarChart3} value={analytics.servedTables} label="Столов обслужено" accent="gold" />
        <SummaryCard icon={Crown} value={analytics.vipOrders} label="ВИП-чеков" accent="coral" />
      </section>

      {/* раздел 1: счётчик по блюдам */}
      <section aria-labelledby="analytics-dishes" className="mt-6">
        <h2 id="analytics-dishes" className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-[#D4AF37]">
          <PieChart className="h-4 w-4" />
          Счётчик по блюдам за день
        </h2>

        {!hasCounters && (
          <div className="mt-3 rounded-2xl border border-dashed border-[#262B35] bg-[#161922]/60 p-6 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm font-bold text-zinc-400">Пока ничего не заказано</p>
            <p className="text-xs text-zinc-600">Счётчики появятся после первых заказов</p>
          </div>
        )}

        <div className="mt-3 space-y-4">
          {grouped.map((group) => (
            <div key={group.key} className="rounded-2xl border border-[#262B35] bg-[#161922] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">{group.title}</h3>
                {group.hint && (
                  <span className="text-right text-[10px] font-semibold italic text-zinc-600">({group.hint})</span>
                )}
              </div>
              <ul className="mt-3 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[13.5px] font-semibold leading-snug text-[#F5F1E8]">
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-xl px-2.5 py-1 text-sm font-black tabular-nums',
                        group.key === 'ГАРНИРЫ'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-300',
                      )}
                    >
                      {item.qty} шт.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* раздел 2: журнал истории чеков */}
      <section aria-labelledby="analytics-history" className="mt-6">
        <h2 id="analytics-history" className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-[#D4AF37]">
          <History className="h-4 w-4" />
          Журнал истории чеков
          {history.length > 0 && (
            <span className="rounded-full bg-[#232936] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
              {history.length}
            </span>
          )}
        </h2>

        {history.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-[#262B35] bg-[#161922]/60 p-6 text-center">
            <RotateCcw className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm font-bold text-zinc-400">Выполненных заказов пока нет</p>
            <p className="text-xs text-zinc-600">Чеки попадут сюда после выноса «ОТДАНО РАННЕРУ»</p>
          </div>
        ) : (
          <div className="nice-scroll mt-3 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {history.map((order) => (
              <HistoryCard key={order.id} order={order} now={now} />
            ))}
          </div>
        )}
      </section>

      {/* раздел 3: сброс */}
      <ResetSection />
      <p className="mt-3 pb-1 text-center text-[10px] font-semibold text-zinc-600">
        ВИТАЛИК · смена {formatDateRu(analytics.date) || '—'} · заказано {analytics.orderedDishes} · отдано{' '}
        {analytics.servedOrders}
      </p>
    </main>
  )
}
