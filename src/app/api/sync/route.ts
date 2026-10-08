import { NextResponse } from 'next/server'
import { getStore, snapshot } from '@/lib/server-store'

/* GET /api/sync — полное состояние для поллинга (каждые 1.5 с) */
export const dynamic = 'force-dynamic'

export async function GET() {
  const state = getStore().state
  return NextResponse.json(snapshot(state), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
