/**
 * Web Audio chime for Money Journal hour completion.
 * `unlockMoneyJournalTimerAudio()` must run after a user gesture (timer Start)
 * so autoplay policies allow sound when the hour hits 0:00.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = sharedCtx ?? new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call from timer Start / Resume so the completion chime can play without autoplay blocking. */
export function unlockMoneyJournalTimerAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    void ctx.resume();
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

export function playMoneyJournalTimerChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    void ctx.resume();

    const scheduleTone = (
      freq: number,
      startAt: number,
      durationSec: number,
      peakGain: number
    ) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, startAt);
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(startAt);
      o.stop(startAt + durationSec + 0.02);
    };

    const t0 = ctx.currentTime;
    scheduleTone(880, t0, 0.22, 0.13);
    scheduleTone(1174, t0 + 0.18, 0.26, 0.11);
    scheduleTone(880, t0 + 0.42, 0.35, 0.1);
  } catch {
    // ignore
  }
}
