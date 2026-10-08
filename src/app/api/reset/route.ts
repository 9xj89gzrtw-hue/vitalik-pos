import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PIN = '0000'

/** «Очистить смену»: заказы, счётчики и стоп-лист — в ноль */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный запрос' }, { status: 400 })
  }

  if (body.pin !== PIN) {
    return NextResponse.json({ ok: false, error: 'Неверный PIN' }, { status: 403 })
  }

  await db.$transaction([
    db.order.deleteMany({}),
    db.dishCounter.deleteMany({}),
    db.stopItem.deleteMany({}),
  ])

  return NextResponse.json({ ok: true })
}
