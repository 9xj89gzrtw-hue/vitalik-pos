'use client'

import { useEffect, useState } from 'react'

/** Тикер времени: перерисовка раз в секунду (таймеры, радар, просрочка) */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
