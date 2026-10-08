import { NextResponse } from 'next/server'
import { ApiError, getStore, resetShift, snapshot } from '@/lib/server-store'

/* POST /api/reset — сброс тестовых данных и начало смены (PIN 0000) */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const store = getStore()
  try {
    const body = (await req.json().catch(() => ({}))) as { pin?: string }
    resetShift(store.state, String(body.pin ?? ''))
    return NextResponse.json(
      { ok: true, state: snapshot(store.state) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: e.message },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('[vitalik] /api/reset error', e)
    return NextResponse.json(
      { ok: false, error: 'Внутренняя ошибка сервера' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
