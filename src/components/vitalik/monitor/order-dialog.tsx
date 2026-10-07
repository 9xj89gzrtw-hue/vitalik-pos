'use client'

import { CircleCheckBig, CircleDashed, Flame } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TABLES_BY_ID } from '@/lib/menu'
import { formatElapsed, orderPieces, pluralDishes } from '@/lib/derive'
import type { Order, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StageBar } from '../stage-bar'
import { useNow } from '../use-now'

/* ============================================================
   Диалог «Стол N»: полный состав заказа, официант, статус
   каждой тарелки. Открывается тапом по плитке радара.
   ============================================================ */

export function TableOrderDialog({
  tableId,
  order,
  onClose,
}: {
  tableId: string | null
  order: Order | null
  onClose: () => void
}) {
  const now = useNow()
  const info = tableId ? TABLES_BY_ID.get(tableId) : null

  return (
    <Dialog open={!!tableId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88dvh] max-w-[440px] overflow-y-auto rounded-3xl border-white/10 bg-[#161B23] nice-scroll">
        {order ? (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2 font-display text-2xl font-black">
                {order.tableLabel}
                {order.isVIP && <span className="vip-chip">⚡ ВИП</span>}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-zinc-500">
                Официант: {order.waiterName} · отправлен {new Date(order.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ⏱ {formatElapsed(now - order.sentAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0F1115] px-2 py-3">
              <StageBar order={order} />
            </div>

            {order.tableNote && (
              <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-300">
                💬 {order.tableNote}
              </div>
            )}

            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                Состав · {pluralDishes(orderPieces(order))}
              </div>
              <ul className="flex flex-col gap-1">
                {order.items.map((item) => (
                  <ItemStatusRow key={item.id} item={item} />
                ))}
              </ul>
              {order.status === 'ready' && (
                <div className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2.5 text-center text-[13px] font-black text-emerald-300">
                  🟢 ВСЁ НА РАЗДАЧЕ — ждёт раннера
                </div>
              )}
            </div>
          </>
        ) : (
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-2xl font-black">{info?.label ?? 'Стол'}</DialogTitle>
            <DialogDescription className="py-6 text-sm font-semibold text-zinc-400">
              <span className="block text-4xl">🪑</span>
              <span className="mt-3 block">Стол свободен</span>
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Заказов нет — ждём гостей
              </span>
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ItemStatusRow({ item }: { item: OrderItem }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-[#0F1115] px-3 py-2">
      <span className="shrink-0">
        {item.status === 'ready' ? (
          <CircleCheckBig className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
        ) : item.status === 'cooking' ? (
          <Flame className="h-5 w-5 animate-pulse text-amber-400" />
        ) : (
          <CircleDashed className="h-5 w-5 text-zinc-600" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[13.5px] font-bold leading-snug', item.status === 'ready' ? 'text-emerald-300' : 'text-zinc-200')}>
          {item.qty}× {item.name}
          {item.isAddendum && (
            <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
              дозаказ
            </span>
          )}
        </div>
        {item.garnishId && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">↳ Гарнир: {item.garnishName}</div>
        )}
        {item.standalone && (
          <div className="mt-0.5 text-[11.5px] font-semibold text-zinc-500">↳ отдельное блюдо</div>
        )}
        {item.comment && (
          <div className="mt-0.5 text-[11.5px] font-bold text-amber-300/90">❗ {item.comment}</div>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {item.status === 'ready' ? 'готово' : item.status === 'cooking' ? 'готовится' : 'в очереди'}
      </span>
    </li>
  )
}
