/* ============================================================
   ВИТАЛИК — автозапуск realtime-сервиса (mini-services/vitalik-hub)
   вместе с Next-сервером. Идемпотентно: если сервис уже отвечает
   (например, его поднял /start.sh контейнера) — ничего не делаем.
   Без статических node-импортов, чтобы не попадать в Edge-bundle.
   ============================================================ */

const SERVICE_PORT = 3003
const SERVICE_DIR = '/home/z/my-project/mini-services/vitalik-hub'
const SERVICE_CMD = `cd ${SERVICE_DIR} && exec bun run dev >> service.log 2>&1`

/** непрозрачный для бандлера динамический импорт node-модуля */
const nodeImport = (spec: string): Promise<any> =>
  new Function('s', 'return import(s)')(spec)

async function serviceAlive(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${SERVICE_PORT}/?EIO=4&transport=polling`, {
      signal: AbortSignal.timeout(1500),
    })
    return res.status < 500
  } catch {
    return false
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    if (await serviceAlive()) {
      console.log('[instrumentation] vitalik-hub уже работает на :3003')
      return
    }
    const { spawn } = await nodeImport('node:child_process')
    const child = spawn('/bin/sh', ['-c', SERVICE_CMD], {
      cwd: SERVICE_DIR,
      detached: true,
      stdio: 'ignore',
      env: process.env,
    })
    child.unref()
    console.log(`[instrumentation] vitalik-hub запущен (pid ${child.pid})`)
  } catch (e) {
    console.warn('[instrumentation] не удалось запустить vitalik-hub:', e)
  }
}
