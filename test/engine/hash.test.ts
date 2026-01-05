import { describe, expect, it } from 'vitest';
import type { Card } from '../../src/engine/cards.js';
import { hashState } from '../../src/engine/hash.js';
import { createSeededRng } from '../../src/engine/rng.js';
import { playRound } from '../../src/engine/round.js';
import { runGame } from '../../src/engine/game.js';
import { createGameState } from '../../src/engine/state.js';

const card = (rank: number, suit: Card['suit']): Card => ({ rank, suit });

describe('hashState', () => {
  it('produces deterministic hashes for counts and full modes', () => {
    const deck = [card(2, '♠'), card(3, '♦'), card(4, '♥'), card(5, '♣')];
    const state = createGameState({ playerNames: ['A', 'B'], deck });

    const countsHash = hashState(state, 'counts');
    const fullHash = hashState(state, 'full');

    expect(countsHash).toBe('60d7f5ddddf8056e8651e22c56eb1dd4f1f14bd3b23024ce912b15e045255410');
    expect(fullHash).toBe('5f0e934240cf8a4d15ce7a632ef80168ac97a470981da58cf8b3b3b9b1102e5d');
    expect(countsHash).not.toBe(fullHash);
    expect(hashState(state, 'counts')).toBe(countsHash);
  });
});

describe('StateHashed events', () => {
  it('emits a StateHashed event per round when enabled', () => {
    const deck = [card(10, '♠'), card(5, '♦'), card(3, '♣'), card(2, '♥')];
    const state = createGameState({ playerNames: ['P1', 'P2'], deck });
    const rng = createSeededRng('state-hash-round');

    const { events, state: nextState } = playRound(state, rng, 'counts');
    const hashEvent = events.find((event) => event.type === 'StateHashed');

    const roundNumber = hashEvent?.round ?? state.round;
    const expectedHash = hashState({ ...nextState, round: roundNumber }, 'counts');

    expect(hashEvent).toBeDefined();
    expect(hashEvent?.round).toBe(1);
    expect(hashEvent?.mode).toBe('counts');
    expect(hashEvent?.hash).toBe(expectedHash);
    expect(events[events.length - 1]?.type).toBe('StateHashed');
  });

  it('produces a stable hash sequence for the first three rounds of a seeded game', () => {
    const result = runGame({
      seed: 'state-hash-seq',
      rules: { maxRounds: 3 },
      stateHashMode: 'counts',
    });

    const hashes = result.events
      .filter((event): event is Extract<(typeof result.events)[number], { type: 'StateHashed' }> => event.type === 'StateHashed')
      .map((event) => event.hash);

    expect(hashes).toEqual([
      '57ec02600e8268ec691d98e80ce31e965441aae9d24e7b1c8401bcc4cedb4a4b',
      '27c3c4e21b2191093d993fb9f8243bb208ab9eef94b993a6218e856783a3a179',
      'bb197eaf3a81e498046def2e09665c10ff85f93c7bc9347c842550a0ef084561',
    ]);
  });
});
