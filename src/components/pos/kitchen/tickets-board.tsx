'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { buildTableTickets } from '@/lib/derive'
import { usePosStore } from '@/lib/store'
import { TicketCard } from './ticket-card'
import { BoardEmpty } from './board-empty'

/** Режим Б — «Заказы по столам»: тикеты, старейшие первыми */
export function TicketsBoard() {
  const orders = usePosStore((s) => s.orders)
  const tickets = useMemo(() => buildTableTickets(orders), [orders])

  if (tickets.length === 0) {
    return <BoardEmpty title="Активных столов нет" />
  }

  return (
    <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {tickets.map((ticket) => (
            <motion.div
              key={ticket.tableNumber}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0"
            >
              <TicketCard ticket={ticket} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  )
}
