/* ============================================================
   ВИТАЛИК — Web Audio API: звуковые сигналы (без внешних файлов)
   Кухня: громкий сигнал при новом заказе (ВИП — тревожнее).
   Зал: мягкий чайм, когда блюдо встало на раздачу.
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

function bellStrike(delay: number, base: number) {
  tone(base, delay, 0.9, 0.22, 'sine')
  tone(base * 2, delay, 0.45, 0.08, 'sine')
  tone(base * 2.76, delay, 0.25, 0.04, 'sine')
}

/** Кухня: новый заказ — двойной удар «колокольчика» (громко) */
export function playOrderBeep() {
  bellStrike(0, 987.77) // B5
  bellStrike(0.42, 1174.66) // D6
}

/** Кухня: ВИП-заказ — тройной тревожный сигнал (выше и плотнее) */
export function playVipOrderBeep() {
  bellStrike(0, 1244.5) // D#6
  bellStrike(0.3, 1244.5)
  bellStrike(0.6, 1567.98) // G6
}

/**
 * Кухня: ГРОМКИЙ цикличный зуммер нового заказа (по ТЗ — каждые 3 секунды,
 * пока шеф не нажал «ПРИНЯТЬ»). Резкая двухтональная сирена ~1.3 с.
 */
export function playNewOrderBuzzer() {
  // три очереди «писк-писк» на двух частотах — услышит вся кухня
  for (let burst = 0; burst < 3; burst++) {
    const d = burst * 0.44
    tone(987.77, d, 0.18, 0.5, 'square')
    tone(740, d + 0.2, 0.18, 0.5, 'square')
  }
}

/** Зал: блюдо на раздаче — мягкий чайм «поднять телефон» */
export function playReadyChime() {
  tone(1046.5, 0, 0.09, 0.14)
  tone(1318.5, 0.1, 0.16, 0.14)
  tone(1567.98, 0.2, 0.22, 0.1)
}

/** Зал: заказ отправлен — короткое подтверждение */
export function playSendConfirm() {
  tone(659.3, 0, 0.07, 0.1)
  tone(880, 0.08, 0.11, 0.1)
}

/** Смена сброшена — низкий подтверждающий тон */
export function playResetBlip() {
  tone(392, 0, 0.1, 0.12)
  tone(261.6, 0.12, 0.16, 0.12)
}

/** Тактильный отклик (где поддерживается) */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* no-op */
  }
}
