'use client'

import { useEffect } from 'react'
import { usePosStore } from '@/lib/store'
import { initPosSocket } from '@/lib/socket'
import { installAudioUnlock } from '@/lib/audio'
import { Splash } from '@/components/pos/splash'
import { RoleSelect } from '@/components/pos/role-select'
import { WaiterView } from '@/components/pos/waiter-view'
import { KitchenView } from '@/components/pos/kitchen-view'

export default function Page() {
  const hydrated = usePosStore((s) => s.hydrated)
  const role = usePosStore((s) => s.role)

  useEffect(() => {
    installAudioUnlock()
    usePosStore.getState().hydrate()
    // deep-link: /?role=kitchen или /?role=waiter
    try {
      const param = new URLSearchParams(window.location.search).get('role')
      if (param === 'kitchen' || param === 'waiter') usePosStore.getState().setRole(param)
    } catch {
      /* no-op */
    }
    initPosSocket()
  }, [])

  if (!hydrated) return <Splash />
  if (!role) return <RoleSelect />
  return role === 'waiter' ? <WaiterView /> : <KitchenView />
}
