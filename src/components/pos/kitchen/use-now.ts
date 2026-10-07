'use client'

import { useSyncExternalStore } from 'react'

/* Единый «тик» 1 с для часов и таймеров KDS:
   одна подписка — один общий интервал, доска не перерисовывается. */

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  timer ??= setInterval(() => {
    for (const notify of listeners) notify()
  }, 1000)
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

/** Снимок текущей секунды (стабильное число — без лишних ре-рендеров) */
const getSnapshot = () => Math.floor(Date.now() / 1000)

/** На сервере/при гидратации — 0 (плейсхолдер), после монтирования — реальное время */
const getServerSnapshot = () => 0

/** Секунды epoch, обновляются раз в секунду */
export function useNowSeconds(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
