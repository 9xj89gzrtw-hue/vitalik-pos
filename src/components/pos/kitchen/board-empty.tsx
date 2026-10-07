'use client'

import { ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Центральное пустое состояние доски кухни */
export function BoardEmpty({ title, className }: { title: string; className?: string }) {
  return (
    <main className={cn('grid flex-1 place-items-center p-6', className)}>
      <div className="animate-fade-up flex flex-col items-center gap-3 text-center">
        <div className="bg-secondary grid size-16 place-items-center rounded-2xl">
          <ChefHat className="text-muted-foreground size-8" strokeWidth={1.8} />
        </div>
        <div className="space-y-1">
          <p className="font-display text-foreground font-bold text-lg">{title}</p>
          <p className="text-muted-foreground text-sm font-medium">Кухня готова к работе</p>
        </div>
      </div>
    </main>
  )
}
