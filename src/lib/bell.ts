/** Один чёткий «дзинь» колокольчика (Web Audio, без файлов).
 *  Звук разблокируется кнопкой «🔔 Включить звук» (политика автоплея). */

let ctx: AudioContext | null = null

export async function unlockAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      ctx = new AC()
    }
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx.state === 'running'
  } catch {
    return false
  }
}

export function audioReady(): boolean {
  return ctx?.state === 'running'
}

/** Одинарный сигнал колокольчика: основной тон + мягкая обертоновая составляющая */
export function playBell(): void {
  if (!ctx || ctx.state !== 'running') return
  try {
    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    const partials: Array<[number, number, number]> = [
      [1318.51, 0.5, 1.2], // E6 — основной
      [2637.02, 0.12, 0.6], // E7 — обертон
      [830.61, 0.08, 0.5], // G#5 — лёгкая «металличность»
    ]
    for (const [freq, vol, dur] of partials) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t)
      osc.stop(t + dur + 0.05)
    }
  } catch {
    /* no-op */
  }
}

export function haptic(pattern: number | number[] = 120): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* no-op */
  }
}
