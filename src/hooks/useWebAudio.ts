let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a tap handler so the browser lets us play the chime later. */
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function playChime() {
  const c = getCtx();
  if (!c) return;
  [880, 1100, 1320].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = c.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
    osc.start(start);
    osc.stop(start + 0.14);
  });
}

export function buzz(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
