/** Русская плюрализация: 1 блюдо / 2 блюда / 5 блюд */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function dishesLabel(n: number): string {
  return `${n} ${plural(n, 'блюдо', 'блюда', 'блюд')}`
}

export function portionsLabel(n: number): string {
  return `${n} ${plural(n, 'порция', 'порции', 'порций')}`
}

export function ordersLabel(n: number): string {
  return `${n} ${plural(n, 'заказ', 'заказа', 'заказов')}`
}

/** «только что» / «4 мин» / «1 ч 05 мин» */
export function ageLabel(ms: number): string {
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  return `${h} ч ${String(m % 60).padStart(2, '0')} мин`
}
