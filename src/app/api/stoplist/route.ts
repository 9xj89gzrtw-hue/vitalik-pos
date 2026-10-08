import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DISH_BY_NAME } from '@/lib/menu'

export const dynamic = 'force-dynamic'

/** Включить/выключить блюдо (стоп-лист) — 1 клик шефа */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный запрос' }, { status: 400 })
  }

  const dish = typeof body.dish === 'string' ? body.dish : ''
  const stopped = body.stopped === true

  if (!DISH_BY_NAME.has(dish)) {
    return NextResponse.json({ ok: false, error: 'Неизвестное блюдо' }, { status: 400 })
  }

  await db.stopItem.upsert({
    where: { dish },
    create: { dish, stopped },
    update: { stopped },
  })

  return NextResponse.json({ ok: true, dish, stopped })
}
