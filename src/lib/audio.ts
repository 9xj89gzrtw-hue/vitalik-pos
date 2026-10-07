/* ============================================================
   Web Audio API — звуковые сигналы (без внешних файлов)
   Кухня: бип при новом заказе. Зал: чайм при готовности блюда.
   ============================================================ */

let ctx: AudioContext | null = null
let unlockInstalled = false

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Разблокировка звука первым касанием (политика автоплея) */
export function installAudioUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const prime = () => ac()
  window.addEventListener('pointerdown', prime, { once: true, capture: true })
  window.addEventListener('keydown', prime, { once: true, capture: true })
}

function tone(freq: number, delay: number, dur: number, vol = 0.16, type: OscillatorType = 'sine') {
  const c = ac()
  if (!c || c.state !== 'running') return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    const t0 = c.currentTime + delay
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch {
    /* no-op */
  }
}

/** Кухня: новый заказ — двойной бип */
export function playOrderBeep() {
  tone(880, 0, 0.13, 0.2)
  tone(1244.5, 0.15, 0.22, 0.2)
}

/** Зал: блюдо готово — мягкий чайм */
export function playReadyChime() {
  tone(1046.5, 0, 0.09, 0.12)
  tone(1318.5, 0.1, 0.16, 0.12)
}

/** Зал: заказ отправлен — короткое подтверждение */
export function playSendConfirm() {
  tone(659.3, 0, 0.07, 0.1)
  tone(880, 0.08, 0.11, 0.1)
}

/** Тактильный отклик (где поддерживается) */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* no-op */
  }
}
