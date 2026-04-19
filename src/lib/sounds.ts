"use client";

// Shared AudioContext — created once and reused so it survives the browser's autoplay policy
let _ctx: AudioContext | null = null;
let _unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return _ctx;
  } catch {
    return null;
  }
}

// Unlock audio context on first user interaction — call once from the page
export function unlockAudio() {
  if (_unlocked) return;
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  _unlocked = true;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15
) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  vol.gain.setValueAtTime(gain, startAt);
  vol.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playSendSound() {
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  playTone(ctx, 880,  t,        0.07, "sine", 0.12);
  playTone(ctx, 1100, t + 0.07, 0.10, "sine", 0.10);
}

export function playReceiveSound() {
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  playTone(ctx, 1200, t,        0.08, "sine", 0.13);
  playTone(ctx, 900,  t + 0.09, 0.10, "sine", 0.11);
  playTone(ctx, 660,  t + 0.19, 0.15, "sine", 0.09);
}
