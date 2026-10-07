'use client'

import { useState } from 'react'
import { BarChart3, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { buildTableMap, pluralDishes } from '@/lib/derive'
import { TABLES } from '@/lib/menu'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TableOrderDialog } from './order-dialog'
import { ResetDialog } from './reset-dialog'
import { useNow } from '../use-now'

/* ============================================================
   Экран 3 «Монитор зала и аналитика» — живой радар всех столов
   и статистика дня. Доступен всей команде.
   ============================================================ */

export function MonitorScreen() {
  const orders = useAppStore((s) => s.orders)
  const analytics = useAppStore((s) => s.analytics)
  const connection = useAppStore((s) => s.connection)
  const [dialogTableId, setDialogTableId] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const now = useNow()

  const tableMap = buildTableMap(orders, now)
  const dialogOrder = dialogTableId ? (tableMap.get(dialogTableId)?.order ?? null) : null

  const maxItemQty = Math.max(1, ...analytics.items.map((i) => i.qty))

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-zinc-500 to-zinc-700 shadow-lg">
            <BarChart3 className="h-5 w-5 text-zinc-100" strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <div className="font-display text-[19px] font-extrabold tracking-tight text-zinc-50">
              Монитор зала
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Радар · аналитика
            </div>
          </div>
        </div>
        {connection !== 'online' && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
            офлайн
          </span>
        )}
      </div>

      {/* Легенда */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 text-[10px] font-bold">
        <LegendDot className="bg-zinc-700" label="свободен" />
        <LegendDot className="bg-yellow-400" label="отправлен" pulse />
        <LegendDot className="bg-amber-500" label="готовится" />
        <LegendDot className="bg-emerald-500" label="на раздаче" pulse />
        <LegendDot className="bg-red-500" label="> 20 мин" pulse />
      </div>

      {/* Живой радар столов */}
      <section aria-label="Живой радар столов">
        <div className="grid grid-cols-5 gap-2">
          {TABLES.map((t) => {
            const st = tableMap.get(t.id)
            const order = st?.order ?? null
            const overdue = st?.overdue ?? false
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setDialogTableId(t.id)}
                aria-label={`${t.label}${order ? ` — ${st!.status}` : ' — свободен'}`}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-2xl transition-all active:scale-95',
                  t.banquet && 'col-span-2 aspect-auto h-[64px]',
                  !order && 'bg-[#1A2029] text-zinc-600',
                  st?.status === 'sent' && 'animate-pulse-bg bg-yellow-400 font-black text-black',
                  st?.status === 'cooking' && 'bg-amber-500 font-black text-black',
                  st?.status === 'ready' && 'animate-pulse-bg bg-emerald-500 font-black text-black shadow-lg shadow-emerald-500/30',
                )}
              >
                <span
                  className={cn(
                    'font-display leading-none',
                    t.banquet ? 'text-[13px]' : 'text-[19px] font-black',
                  )}
                >
                  {t.banquet ? t.label : t.short}
                </span>
                {order && (
                  <TimerText order={order} now={now} />
                )}
                {order?.isVIP && (
                  <span className="absolute left-1 top-1 text-[10px] leading-none" aria-hidden>
                    ⚡
                  </span>
                )}
                {overdue && (
                  <span
                    className="absolute right-1 top-1 grid h-4 w-4 animate-pulse place-items-center rounded-full bg-red-500 text-[9px] font-black text-white"
                    aria-label="Дольше 20 минут"
                  >
                    !
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Аналитика за день */}
      <section aria-label="Аналитика за день" className="flex flex-col gap-3">
        <h3 className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
          Аналитика за день
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Обслужено столов" value={analytics.servedTables} />
          <StatCard label="Отдано блюд" value={analytics.totalDishes} />
          <StatCard label="ВИП заказов" value={analytics.vipOrders} accent />
        </div>

        {analytics.items.length > 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-[#161B23] px-4 py-3">
            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Отдано по наименованиям · {pluralDishes(analytics.totalDishes)}
            </div>
            <ul className="flex flex-col gap-1.5">
              {analytics.items.map((item) => (
                <li key={item.menuItemId} className="flex items-center gap-3">
                  <span className="w-[46%] shrink-0 truncate text-[13px] font-bold text-zinc-300">
                    {item.name}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#0F1115]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${Math.max(6, (item.qty / maxItemQty) * 100)}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[13px] font-black tabular-nums text-emerald-400">
                    {item.qty}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161B23] px-4 py-4 text-center text-xs font-semibold text-zinc-500">
            Пока ничего не отдано — счётчики появятся после первых «ОТДАНО РАННЕРУ».
          </div>
        )}
      </section>

      {/* Утренний сброс */}
      <section aria-label="Утренний сброс" className="rounded-3xl border border-red-500/20 bg-[#161B23] p-4">
        <div className="text-[13px] font-extrabold text-zinc-200">Утренний сброс</div>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Обнуляет все активные чеки и счётчики дня — чтобы после тренировки открыть смену
          с чистого листа. Защищено пин-кодом.
        </p>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 text-[14px] font-extrabold text-red-400 transition-all active:scale-[0.98]"
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.5} />
          Очистить тестовые данные / Открыть новую смену
        </button>
      </section>

      {/* Диалог состава заказа */}
      <TableOrderDialog
        tableId={dialogTableId}
        order={dialogOrder}
        onClose={() => setDialogTableId(null)}
      />

      {/* Диалог сброса */}
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  )
}

function LegendDot({
  className,
  label,
  pulse = false,
}: {
  className: string
  label: string
  pulse?: boolean
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#161B23] px-2.5 py-1 text-zinc-400">
      <span className={cn('h-2 w-2 rounded-full', className, pulse && 'animate-pulse')} />
      {label}
    </span>
  )
}

function TimerText({ order, now }: { order: Order; now: number }) {
  const text =
    order.status === 'ready'
      ? 'забрать!'
      : `${Math.floor((now - order.sentAt) / 60000)} мин`
  return (
    <span className="mt-1 text-[10px] font-bold tabular-nums leading-none opacity-80">
      {text}
    </span>
  )
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-3 text-center',
        accent ? 'border-amber-400/25 bg-amber-400/[0.07]' : 'border-white/[0.07] bg-[#161B23]',
      )}
    >
      <div
        className={cn(
          'font-display text-2xl font-black tabular-nums leading-none',
          accent ? 'text-amber-300' : 'text-zinc-50',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[9.5px] font-bold uppercase leading-tight tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  )
}
