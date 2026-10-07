'use client'

import { ConnectionDot } from '@/components/pos/connection-dot'
import { usePosStore } from '@/lib/store'

/** Нижняя полоска KDS: состояние связи и подпись */
export function KitchenFooter() {
  const offline = usePosStore((s) => s.connection === 'offline')

  return (
    <footer className="bg-background/60 border-t border-border shrink-0 safe-bottom">
      <div className="text-muted-foreground mx-auto flex h-10 w-full max-w-[1720px] items-center justify-between gap-3 px-4 text-[11px] font-medium md:px-6">
        <span className="inline-flex min-w-0 items-center gap-2">
          <ConnectionDot withLabel={false} />
          <span className="truncate">
            {offline ? 'Нет связи — изменения не отправляются' : 'Синхронизация зала и кухни'}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap">Пасс · KDS · демо</span>
      </div>
    </footer>
  )
}
