'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ChefHat, ConciergeBell, UtensilsCrossed } from 'lucide-react'
import { usePosStore } from '@/lib/store'
import { TABLES_COUNT } from '@/lib/menu'

export function RoleSelect() {
  const setRole = usePosStore((s) => s.setRole)

  const options = [
    {
      role: 'waiter' as const,
      icon: ConciergeBell,
      title: 'Я в зале',
      desc: 'Терминал официанта · мобильный',
      hint: 'Столы, чек, отправка на кухню',
      accent: 'text-primary',
      tile: 'bg-primary/10 text-primary',
    },
    {
      role: 'kitchen' as const,
      icon: ChefHat,
      title: 'Я на кухне',
      desc: 'KDS · сводка цеха и тикеты',
      hint: 'Батчинг по курсам, статусы',
      accent: 'text-amber-600',
      tile: 'bg-amber-500/15 text-amber-600',
    },
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* мягкий тёплый градиент */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45dvh] bg-[radial-gradient(80%_60%_at_50%_0%,oklch(0.955_0.03_70/0.8),transparent)]"
      />
      <main className="relative flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-up">
          <div className="size-[68px] rounded-[22px] bg-primary text-primary-foreground grid place-items-center shadow-xl shadow-primary/30">
            <UtensilsCrossed className="size-9" strokeWidth={2.1} />
          </div>
          <div>
            <h1 className="font-display text-[40px] leading-none font-extrabold tracking-tight">ПАСС</h1>
            <p className="mt-3 text-muted-foreground text-sm font-medium">
              Связь зала и кухни в реальном времени
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-md gap-3.5">
          {options.map((o, i) => (
            <motion.button
              key={o.role}
              type="button"
              onClick={() => setRole(o.role)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.975 }}
              className="group relative flex min-h-[104px] items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl ${o.tile}`}>
                <o.icon className="size-7" strokeWidth={1.9} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-lg font-bold leading-tight">{o.title}</span>
                <span className="text-sm text-muted-foreground leading-snug">{o.desc}</span>
                <span className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${o.accent}`}>
                  {o.hint}
                </span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                strokeWidth={2.2}
              />
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="relative mt-auto safe-bottom">
        <p className="pb-5 pt-2 text-center text-[11px] font-medium text-muted-foreground/70">
          {TABLES_COUNT} столов · меню завтрака и обеда · демо-режим
        </p>
      </footer>
    </div>
  )
}
