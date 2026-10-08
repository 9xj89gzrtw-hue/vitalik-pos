'use client'

import { useState } from 'react'
import { useVitalik } from '@/lib/api-client'
import { haptic } from '@/lib/audio'
import type { RunnerBannerData } from '@/lib/derive'
import { cn } from '@/lib/utils'

/* ============================================================
   📢 Баннер ВЫНОС для раннера (без телефона): контрастная плашка
   «ВЫНОС: СТОЛ № X | Официант | Блюда». Шеф голосом командует:
   «Раннер, забери Стол 4 для Дениса!». После выноса — одна кнопка.
   ============================================================ */

export function RunnerBanner({ banner }: { banner: RunnerBannerData }) {
  const { mutate } = useVitalik()
  const [busy, setBusy] = useState(false)

  const served = async () => {
    if (busy) return
    setBusy(true)
    haptic([20, 40])
    await mutate('/api/orders', { action: 'served', table: banner.table })
    setBusy(false)
  }

  return (
    <div
      role="alert"
      className={cn(
        'overflow-hidden rounded-3xl border-2 shadow-xl',
        banner.vip
          ? 'border-[#D4AF37] bg-gradient-to-br from-[#10B981]/25 to-[#161922]'
          : 'border-emerald-500/70 bg-gradient-to-br from-[#10B981]/20 to-[#161922]',
      )}
    >
      <div className="ready-strip">🏃 Забрать с раздачи!</div>
      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[22px] font-black uppercase leading-none tracking-tight text-emerald-300">
            📢 ВЫНОС: СТОЛ № {banner.table}
          </span>
          <span className="text-[14px] font-black uppercase text-[#F5F1E8]">
            Официант: {banner.waiter.toUpperCase()}
          </span>
          {banner.vip && <span className="vip-chip">⭐ ВИП СТОЛ</span>}
        </div>
        <p className="mt-1.5 text-[16px] font-bold leading-snug text-[#F5F1E8]">
          Блюда: {banner.dishes.join(', ')}
        </p>
        <button
          type="button"
          onClick={() => void served()}
          disabled={busy}
          className="mt-3 h-[56px] w-full rounded-2xl bg-emerald-500 text-[16px] font-black uppercase tracking-wide text-[#05140E] shadow-lg shadow-emerald-500/30 disabled:opacity-50 active:scale-[0.98]"
        >
          ✅ ОТДАНО РАННЕРУ
        </button>
      </div>
    </div>
  )
}
