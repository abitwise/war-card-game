import type { RoundEvent } from './engine/round.js';

export const DEFAULT_PLAYBACK_DELAY_MS = 50;

export const hasWarEvent = (events: RoundEvent[]): boolean =>
  events.some((event) => event.type === 'WarStarted');

export const computePlaybackDelayMs = (
  speed?: number,
  delayMs?: number,
  fallback: number = DEFAULT_PLAYBACK_DELAY_MS,
): number => {
  const baseDelay = delayMs ?? fallback;
  const speedMultiplier = speed ?? 1;
  if (!Number.isFinite(baseDelay) || baseDelay < 0) {
    return 0;
  }
  if (!Number.isFinite(speedMultiplier) || speedMultiplier <= 0) {
    return baseDelay;
  }
  return Math.max(0, Math.round(baseDelay / speedMultiplier));
};
