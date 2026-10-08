import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { OrderItem, OrderView } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Лёгкий снапшот для поллинга (клиент опрашивает раз в 1.5с) */
export async function GET() {
  const [orders, counters, stops, totalOrders] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ['pending', 'ready'] } },
      orderBy: { createdAt: 'asc' },
    }),
    db.dishCounter.findMany({ orderBy: { qty: 'desc' } }),
    db.stopItem.findMany({ where: { stopped: true } }),
    db.order.count(),
  ])

  const views: OrderView[] = orders.map((o) => ({
    id: o.id,
    table: o.tableNumber,
    waiter: o.waiter,
    vip: o.isVip,
    status: o.status as 'pending' | 'ready',
    items: JSON.parse(o.itemsJson) as OrderItem[],
    comment: o.comment,
    createdAt: o.createdAt.getTime(),
    readyAt: o.readyAt ? o.readyAt.getTime() : null,
  }))

  return NextResponse.json(
    {
      serverTime: Date.now(),
      orders: views,
      counters: counters.map((c) => ({ dish: c.dish, qty: c.qty })),
      stopped: stops.map((s) => s.dish),
      stats: {
        totalOrders,
        totalPortions: counters.reduce((sum, c) => sum + c.qty, 0),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
