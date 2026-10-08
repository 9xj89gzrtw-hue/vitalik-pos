/** Ошибка от сервера (валидация, стоп-лист, неверный PIN) — ретраить нельзя */
export class ApiError extends Error {
  status: number
  payload: Record<string, unknown> | null

  constructor(message: string, status: number, payload: Record<string, unknown> | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * POST JSON с устойчивостью к обрывам мобильной сети:
 * сетевые/5xx ошибки тихо ретраятся (1с пауза), ошибки валидации — сразу наружу.
 */
export async function postJSON<T = { ok: true }>(url: string, body: unknown, retries = 5): Promise<T> {
  let lastNetworkError: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) return (await res.json()) as T
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
      const message = data && typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`
      if (res.status >= 400 && res.status < 500 && res.status !== 408) {
        throw new ApiError(message, res.status, data)
      }
      throw new Error(message)
    } catch (e) {
      if (e instanceof ApiError) throw e
      lastNetworkError = e
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  console.warn('[vitalik] POST не прошёл после ретраев:', url, lastNetworkError)
  throw new ApiError('Нет связи с сервером — попробуйте ещё раз', 0, null)
}
