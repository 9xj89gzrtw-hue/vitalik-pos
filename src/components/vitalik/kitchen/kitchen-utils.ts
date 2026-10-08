'use client'

import type { Order } from '@/lib/types'

/** «Стол 7» → «СТОЛ №7» — для ультра-крупных заголовков экрана кухни */
export function tableTitleOf(order: Pick<Order, 'tableLabel'>): string {
  const m = /^Стол (\d+)$/.exec(order.tableLabel)
  return m ? `СТОЛ №${m[1]}` : order.tableLabel.toUpperCase()
}
