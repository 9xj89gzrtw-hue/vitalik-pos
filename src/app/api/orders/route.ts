import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DISH_BY_NAME, GARNISH_NAMES, TABLE_COUNT, WAITERS } from '@/lib/menu'
import type { OrderItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

function bad(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return bad('Некорректный запрос')
  }

  const action = body.action

  /* ---------- Официант отправил заказ на кухню ---------- */
  if (action === 'create') {
    const table = Number(body.table)
    const waiter = typeof body.waiter === 'string' ? body.waiter : ''
    const vip = body.vip === true
    const rawItems = Array.isArray(body.items) ? body.items : []

    if (!Number.isInteger(table) || table < 1 || table > TABLE_COUNT) return bad('Выберите стол')
    if (!(WAITERS as readonly string[]).includes(waiter)) return bad('Выберите официанта')
    if (rawItems.length === 0) return bad('Корзина пуста')
    if (rawItems.length > 40) return bad('Слишком много позиций в одном заказе')

    const items: OrderItem[] = []
    for (const raw of rawItems) {
      const it = raw as Record<string, unknown>
      const dish = typeof it.dish === 'string' ? it.dish : ''
      const qty = Number(it.qty)
      const garnish = typeof it.garnish === 'string' && it.garnish ? it.garnish : undefined
      if (!DISH_BY_NAME.has(dish)) return bad(`Неизвестное блюдо: ${dish || '—'}`)
      if (!Number.isInteger(qty) || qty < 1 || qty > 30) return bad(`Неверное количество: ${dish}`)
      if (garnish && !GARNISH_NAMES.has(garnish)) return bad(`Неизвестный гарнир: ${garnish}`)
      items.push({ dish, qty, garnish })
    }

    // Стоп-лист проверяет сервер — он источник истины
    const ordered = new Set<string>()
    for (const it of items) {
      ordered.add(it.dish)
      if (it.garnish) ordered.add(it.garnish)
    }
    const stops = await db.stopItem.findMany({ where: { stopped: true, dish: { in: [...ordered] } } })
    if (stops.length > 0) {
      const names = stops.map((s) => s.dish)
      return bad(`В стоп-листе: ${names.join(', ')}`, 409, { stopped: names })
    }

    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 200) : ''

    const order = await db.$transaction(async (tx) => {
      for (const it of items) {
        await tx.dishCounter.upsert({
          where: { dish: it.dish },
          create: { dish: it.dish, qty: it.qty },
          update: { qty: { increment: it.qty } },
        })
        if (it.garnish) {
          await tx.dishCounter.upsert({
            where: { dish: it.garnish },
            create: { dish: it.garnish, qty: it.qty },
            update: { qty: { increment: it.qty } },
          })
        }
      }
      return tx.order.create({
        data: {
          tableNumber: table,
          waiter,
          isVip: vip,
          status: 'pending',
          itemsJson: JSON.stringify(items),
          comment: comment || null,
        },
      })
    })

    return NextResponse.json({ ok: true, id: order.id })
  }

  /* ---------- Кухня: готово к выносу / забрали ---------- */
  if (action === 'ready' || action === 'archive') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return bad('Не указан заказ')

    if (action === 'ready') {
      const updated = await db.order.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'ready', readyAt: new Date() },
      })
      if (updated.count === 0) {
        const exists = await db.order.findUnique({ where: { id } })
        if (!exists) return bad('Заказ не найден', 404)
        // уже ready — идемпотентно, ничего не делаем
      }
    } else {
      const updated = await db.order.updateMany({
        where: { id, status: { in: ['pending', 'ready'] } },
        data: { status: 'archived', archivedAt: new Date() },
      })
      if (updated.count === 0) {
        const exists = await db.order.findUnique({ where: { id } })
        if (!exists) return bad('Заказ не найден', 404)
      }
    }
    return NextResponse.json({ ok: true })
  }

  return bad('Неизвестное действие')
}
