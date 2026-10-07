'use client'

import { UtensilsCrossed } from 'lucide-react'

export function Splash() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-breathe">
        <div className="size-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/25">
          <UtensilsCrossed className="size-8" strokeWidth={2.2} />
        </div>
        <div className="font-display text-2xl font-extrabold tracking-tight">ПАСС</div>
      </div>
    </div>
  )
}
