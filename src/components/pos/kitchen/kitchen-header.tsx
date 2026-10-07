'use client'

import { useMemo } from 'react'
import { ArrowLeftRight, ChefHat, ClipboardList, Layers, Volume2, VolumeX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ConnectionDot } from '@/components/pos/connection-dot'
import { playOrderBeep } from '@/lib/audio'
import { usePosStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { LiveClock } from './live-clock'

const MODES = [
  { mode: 'batch' as const, icon: Layers, label: 'Сводка цеха', short: 'Цех' },
  { mode: 'tickets' as const, icon: ClipboardList, label: 'По столам', short: 'Столы' },
]

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/** Шапка KDS: бренд, переключатель режимов, часы, статистика, звук, связь */
export function KitchenHeader() {
  const kitchenMode = usePosStore((s) => s.kitchenMode)
  const soundEnabled = usePosStore((s) => s.soundEnabled)
  const orders = usePosStore((s) => s.orders)

  const stats = useMemo(() => {
    const tables = new Set<number>()
    let inWork = 0
    for (const order of orders) {
      tables.add(order.tableNumber)
      for (const item of order.items) {
        if (item.status !== 'done') inWork += 1
      }
    }
    return { tables: tables.size, inWork }
  }, [orders])

  const toggleSound = () => {
    const next = !soundEnabled
    usePosStore.getState().setSoundEnabled(next)
    if (next) playOrderBeep()
  }

  return (
    <header className="bg-background/85 border-b border-border shrink-0 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1720px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
        {/* Бренд */}
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl shadow-lg shadow-primary/25">
            <ChefHat className="size-5.5" strokeWidth={2} />
          </span>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-foreground text-xl leading-none font-extrabold tracking-tight">
              ПАСС
            </span>
            <Badge
              variant="secondary"
              className="hidden text-[10px] font-bold tracking-[0.14em] uppercase sm:inline-flex"
            >
              Кухня · KDS
            </Badge>
          </div>
        </div>

        {/* Переключатель режимов — главный инструмент */}
        <nav
          aria-label="Режим экрана кухни"
          className="order-last flex w-full md:order-none md:w-auto md:flex-1 md:justify-center"
        >
          <div className="bg-secondary flex w-full rounded-xl p-1 md:w-auto">
            {MODES.map((m) => {
              const active = kitchenMode === m.mode
              const Icon = m.icon
              return (
                <button
                  key={m.mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => usePosStore.getState().setKitchenMode(m.mode)}
                  className={cn(
                    FOCUS,
                    'hover:text-foreground active:scale-95 h-11 flex-1 rounded-lg px-4 text-sm font-bold transition-all duration-150 md:flex-none md:px-6',
                    'inline-flex items-center justify-center gap-2',
                    active
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                      : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-4.5 shrink-0" strokeWidth={2.2} />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.short}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Правый кластер: часы, статистика, звук, связь, смена роли */}
        <div className="ml-auto flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <LiveClock />

          <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-xs font-bold tabular-nums whitespace-nowrap">
            Столов: {stats.tables}
          </span>
          <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-xs font-bold tabular-nums whitespace-nowrap">
            В работе: {stats.inWork}
          </span>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            className={cn(
              FOCUS,
              'bg-secondary grid size-10 shrink-0 place-items-center rounded-xl transition-colors active:scale-95',
              soundEnabled
                ? 'text-amber-400'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>

          <ConnectionDot />

          <button
            type="button"
            onClick={() => usePosStore.getState().setRole(null)}
            aria-label="Сменить роль"
            className={cn(
              FOCUS,
              'text-muted-foreground hover:bg-secondary hover:text-foreground grid size-10 shrink-0 place-items-center rounded-xl transition-colors active:scale-95',
            )}
          >
            <ArrowLeftRight className="size-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
