import { describe, expect, it } from 'vitest';
import { createDeck } from '../../src/engine/deck.js';
import { defaultWarRules, validateWarRules } from '../../src/engine/rules.js';
import { createGameState } from '../../src/engine/state.js';

describe('war rules defaults and validation', () => {
  it('applies documented defaults', () => {
    const rules = validateWarRules();
    expect(rules).toEqual(defaultWarRules);
  });

  it('allows overrides and keeps other defaults', () => {
    const rules = validateWarRules({ tieResolution: 'sudden-death', maxRounds: 5000 });
    expect(rules.tieResolution).toBe('sudden-death');
    expect(rules.maxRounds).toBe(5000);
    expect(rules.warFaceDownCount).toBe(1);
    expect(rules.collectMode).toBe('won-pile');
  });

  it('rejects invalid collect mode', () => {
    expect(() => validateWarRules({ collectMode: 'invalid' as any })).toThrow();
  });

  it('rejects negative face-down count', () => {
    expect(() => validateWarRules({ warFaceDownCount: -1 })).toThrow();
  });

  it('rejects invalid max rounds', () => {
    expect(() => validateWarRules({ maxRounds: 0 })).toThrow();
  });
});

describe('game state creation', () => {
  it('creates default players and table state', () => {
    const state = createGameState();
    expect(state.players).toHaveLength(2);
    expect(state.table).toEqual({ battleCards: [], inWar: false });
    expect(state.round).toBe(1);
    expect(state.active).toBe(true);
    expect(state.stats).toEqual({ wars: 0, flips: 0 });
  });

  it('deals deck evenly across players', () => {
    const deck = createDeck();
    const state = createGameState({ playerNames: ['Alice', 'Bob'], deck });

    const totalCards = state.players.reduce((sum, player) => sum + player.drawPile.length, 0);
    expect(totalCards).toBe(deck.length);
    expect(Math.abs(state.players[0].drawPile.length - state.players[1].drawPile.length)).toBeLessThanOrEqual(1);
  });

  it('applies rule overrides when building game state', () => {
    const state = createGameState({ rules: { tieResolution: 'sudden-death', maxRounds: 500 } });
    expect(state.config.tieResolution).toBe('sudden-death');
    expect(state.config.maxRounds).toBe(500);
  });
});
