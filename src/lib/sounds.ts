"use client";

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18,
  fadeOut = true
) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    if (fadeOut) vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {
    // audio not supported
  }
}

export function playSendSound() {
  // Rising two-tone "sent" beep
  playTone(880, 0.08, "sine", 0.12);
  setTimeout(() => playTone(1100, 0.1, "sine", 0.10), 80);
}

export function playReceiveSound() {
  // Descending soft chime "incoming"
  playTone(1200, 0.1, "sine", 0.13);
  setTimeout(() => playTone(900, 0.12, "sine", 0.11), 90);
  setTimeout(() => playTone(660, 0.18, "sine", 0.09), 180);
}
