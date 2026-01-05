import { describe, expect, it } from 'vitest';
import { computePlaybackDelayMs, DEFAULT_PLAYBACK_DELAY_MS, hasWarEvent } from '../src/playback.js';
import type { RoundEvent } from '../src/engine/round.js';

describe('hasWarEvent', () => {
  it('returns false for empty events array', () => {
    expect(hasWarEvent([])).toBe(false);
  });

  it('returns false when no war events are present', () => {
    const events: RoundEvent[] = [
      { type: 'CardsPlayed', player1Card: { rank: 'A', suit: 'Hearts' }, player2Card: { rank: 'K', suit: 'Spades' } },
      { type: 'RoundWon', winner: 1, cardsWon: 2 },
    ];
    expect(hasWarEvent(events)).toBe(false);
  });

  it('returns true when a war event is present', () => {
    const events: RoundEvent[] = [
      { type: 'CardsPlayed', player1Card: { rank: 'A', suit: 'Hearts' }, player2Card: { rank: 'A', suit: 'Spades' } },
      { type: 'WarStarted' },
      { type: 'RoundWon', winner: 1, cardsWon: 6 },
    ];
    expect(hasWarEvent(events)).toBe(true);
  });

  it('returns true when multiple war events are present', () => {
    const events: RoundEvent[] = [
      { type: 'WarStarted' },
      { type: 'CardsPlayed', player1Card: { rank: 'K', suit: 'Hearts' }, player2Card: { rank: 'K', suit: 'Spades' } },
      { type: 'WarStarted' },
      { type: 'RoundWon', winner: 2, cardsWon: 10 },
    ];
    expect(hasWarEvent(events)).toBe(true);
  });
});

describe('computePlaybackDelayMs', () => {
  describe('default behavior', () => {
    it('returns default delay when no parameters provided', () => {
      expect(computePlaybackDelayMs()).toBe(DEFAULT_PLAYBACK_DELAY_MS);
    });

    it('returns custom fallback when provided and no other parameters given', () => {
      expect(computePlaybackDelayMs(undefined, undefined, 100)).toBe(100);
    });
  });

  describe('delay-based behavior', () => {
    it('returns the specified delayMs when provided', () => {
      expect(computePlaybackDelayMs(undefined, 200)).toBe(200);
    });

    it('returns 0 when delayMs is 0', () => {
      expect(computePlaybackDelayMs(undefined, 0)).toBe(0);
    });

    it('returns 0 when delayMs is negative', () => {
      expect(computePlaybackDelayMs(undefined, -10)).toBe(0);
    });

    it('returns 0 when delayMs is NaN', () => {
      expect(computePlaybackDelayMs(undefined, NaN)).toBe(0);
    });

    it('returns 0 when delayMs is Infinity', () => {
      expect(computePlaybackDelayMs(undefined, Infinity)).toBe(0);
    });

    it('returns 0 when delayMs is -Infinity', () => {
      expect(computePlaybackDelayMs(undefined, -Infinity)).toBe(0);
    });
  });

  describe('speed-based behavior', () => {
    it('divides base delay by speed multiplier', () => {
      expect(computePlaybackDelayMs(2, 100)).toBe(50);
    });

    it('increases delay when speed is less than 1', () => {
      expect(computePlaybackDelayMs(0.5, 100)).toBe(200);
    });

    it('handles high speed multipliers', () => {
      expect(computePlaybackDelayMs(10, 100)).toBe(10);
    });

    it('returns base delay when speed is NaN', () => {
      expect(computePlaybackDelayMs(NaN, 100)).toBe(100);
    });

    it('returns base delay when speed is 0', () => {
      expect(computePlaybackDelayMs(0, 100)).toBe(100);
    });

    it('returns base delay when speed is negative', () => {
      expect(computePlaybackDelayMs(-1, 100)).toBe(100);
    });

    it('returns base delay when speed is Infinity', () => {
      expect(computePlaybackDelayMs(Infinity, 100)).toBe(100);
    });

    it('returns base delay when speed is -Infinity', () => {
      expect(computePlaybackDelayMs(-Infinity, 100)).toBe(100);
    });
  });

  describe('combined speed and delay behavior', () => {
    it('applies speed to custom delay', () => {
      expect(computePlaybackDelayMs(2, 500)).toBe(250);
    });

    it('applies speed to default delay when delayMs is undefined', () => {
      expect(computePlaybackDelayMs(2)).toBe(DEFAULT_PLAYBACK_DELAY_MS / 2);
    });

    it('rounds fractional results to nearest integer', () => {
      expect(computePlaybackDelayMs(3, 100)).toBe(33);
    });

    it('never returns negative delay even with invalid inputs', () => {
      expect(computePlaybackDelayMs(-5, -100)).toBe(0);
    });

    it('handles very small delays with high speed', () => {
      expect(computePlaybackDelayMs(100, 10)).toBe(0);
    });

    it('handles very large delays with low speed', () => {
      expect(computePlaybackDelayMs(0.1, 1000)).toBe(10000);
    });
  });
});
