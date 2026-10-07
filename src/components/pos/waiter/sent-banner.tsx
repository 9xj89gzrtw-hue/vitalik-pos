'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { usePosStore } from '@/lib/store'

/** Плашка «Заказ отправлен!» — источник store.justSent (~2с), не ловит тапы */
export function SentBanner() {
  const justSent = usePosStore((s) => s.justSent)

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[72px] z-50" aria-live="polite">
      <AnimatePresence>
        {justSent ? (
          <motion.div
            key={justSent.at}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl"
          >
            <CheckCircle2 className="size-4.5 shrink-0" aria-hidden="true" />
            <span>Заказ отправлен! · Стол {justSent.table} · {justSent.pieces} шт</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
