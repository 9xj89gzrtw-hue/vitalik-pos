import { NextResponse } from 'next/server'
import { ApiError, applyStoplistAction, getStore, snapshot } from '@/lib/server-store'

/* POST /api/stoplist — мутации стоп-листа:
   setStopped · setLimit */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const store = getStore()
  try {
    const body = (await req.json()) as Record<string, unknown>
    if (!body || typeof body.action !== 'string') {
      throw new ApiError('Некорректный запрос')
    }
    const result = applyStoplistAction(store, body)
    return NextResponse.json(
      { ok: true, ...result, state: snapshot(store.state) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: e.message, state: snapshot(store.state) },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('[vitalik] /api/stoplist error', e)
    return NextResponse.json(
      { ok: false, error: 'Внутренняя ошибка сервера' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
