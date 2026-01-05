import { describe, expect, it } from 'vitest';
import type { Card, Suit } from '../../src/engine/cards.js';
import { createSeededRng } from '../../src/engine/rng.js';
import { playRound } from '../../src/engine/round.js';
import { createGameState } from '../../src/engine/state.js';

const card = (rank: number, suit: Suit): Card => ({ rank, suit });

const setupState = (p1Cards: Card[], p2Cards: Card[], rules = {}) => {
  const state = createGameState({ playerNames: ['P1', 'P2'], rules });
  state.players[0].drawPile = [...p1Cards];
  state.players[1].drawPile = [...p2Cards];
  return state;
};

describe('playRound - basic resolution', () => {
  it('awards a simple battle to the higher face-up card', () => {
    const state = setupState([card(10, '♠')], [card(5, '♦')]);
    const { state: next, events } = playRound(state, createSeededRng('basic'));

    expect(next.players[0].wonPile).toHaveLength(2);
    expect(next.players[1].drawPile).toHaveLength(0);
    expect(next.stats.flips).toBe(2);
    expect(next.stats.wars).toBe(0);
    expect(next.round).toBe(2);
    expect(events.some((e) => e.type === 'TrickWon' && e.winner === 0)).toBe(true);
  });

  it('collects into draw pile when collectMode is bottom-of-draw', () => {
    const state = setupState([card(9, '♠')], [card(3, '♥')], { collectMode: 'bottom-of-draw' });
    const { state: next } = playRound(state, createSeededRng('collect'));

    expect(next.players[0].drawPile).toEqual([card(9, '♠'), card(3, '♥')]);
    expect(next.players[0].wonPile).toHaveLength(0);
  });
});

describe('playRound - wars and edge cases', () => {
  it('resolves a standard war with face-down cards', () => {
    const state = setupState(
      [card(6, '♠'), card(2, '♠'), card(9, '♠')],
      [card(6, '♥'), card(3, '♥'), card(4, '♥')],
    );

    const { state: next } = playRound(state, createSeededRng('war'));

    expect(next.stats.wars).toBe(1);
    expect(next.stats.flips).toBe(4); // two initial, two war face-up
    expect(next.players[0].wonPile).toHaveLength(6);
    expect(next.players[1].drawPile).toHaveLength(0);
  });

  it('declares a winner when a player cannot continue a war', () => {
    const state = setupState([card(5, '♠')], [card(5, '♥'), card(2, '♥'), card(9, '♥')]);
    const { state: next, events } = playRound(state, createSeededRng('war-loss'));

    expect(next.active).toBe(false);
    expect(next.winner).toBe(1);
    expect(events.some((e) => e.type === 'GameEnded' && e.reason === 'win')).toBe(true);
  });

  it('recycles won pile when draw pile is empty', () => {
    const state = setupState([], [card(2, '♥')]);
    state.players[0].wonPile = [card(10, '♠')];

    const { state: next, events } = playRound(state, createSeededRng('recycle'));

    expect(events.some((e) => e.type === 'PileRecycled' && e.playerId === 0)).toBe(true);
    expect(next.players[0].wonPile).toHaveLength(2);
    expect(next.players[0].drawPile.length).toBe(0);
  });

  it('handles sudden-death tie resolution without face-down buildup', () => {
    const state = setupState([card(5, '♠'), card(9, '♠')], [card(5, '♥'), card(3, '♥')], {
      tieResolution: 'sudden-death',
      warFaceDownCount: 2,
    });

    const { state: next } = playRound(state, createSeededRng('sudden'));

    expect(next.stats.wars).toBe(1);
    expect(next.stats.flips).toBe(4);
    expect(next.players[0].wonPile).toHaveLength(4);
  });

  it('halts play on maxRounds timeout', () => {
    const state = setupState([card(8, '♠'), card(2, '♠')], [card(7, '♥'), card(3, '♥')], { maxRounds: 1 });
    const { state: next, events } = playRound(state, createSeededRng('timeout'));

    expect(next.active).toBe(false);
    expect(events.some((e) => e.type === 'GameEnded' && e.reason === 'timeout')).toBe(true);
  });

  it('runs wars among only tied-highest players in multi-player games', () => {
    const state = createGameState({ playerNames: ['A', 'B', 'C'] });
    state.players[0].drawPile = [card(7, '♠'), card(4, '♠'), card(14, '♣')];
    state.players[1].drawPile = [card(7, '♥'), card(3, '♥'), card(13, '♦')];
    state.players[2].drawPile = [card(4, '♦'), card(9, '♦'), card(5, '♠')];

    const { state: next, events } = playRound(state, createSeededRng('multi-war'));
    const warEvent = events.find((event) => event.type === 'WarStarted') as
      | Extract<ReturnType<typeof playRound>['events'][number], { type: 'WarStarted' }>
      | undefined;

    expect(warEvent?.participants).toEqual([0, 1]);
    expect(next.stats.wars).toBe(1);
    expect(next.players[0].wonPile.length).toBe(7);
    expect(next.players[1].drawPile.length + next.players[1].wonPile.length).toBe(0);
    expect(next.players[2].drawPile.length + next.players[2].wonPile.length).toBe(2);
  });

  it('eliminates players with no cards at round start and declares the remaining winner', () => {
    const state = createGameState({ playerNames: ['Solo', 'Out', 'Gone'] });
    state.players[0].drawPile = [card(10, '♠')];
    state.players[1].drawPile = [];
    state.players[2].drawPile = [];

    const { state: next, events } = playRound(state, createSeededRng('solo-win'));
    const ending = events.find((event) => event.type === 'GameEnded');

    expect(ending && ending.type === 'GameEnded' ? ending.winner : undefined).toBe(0);
    expect(next.active).toBe(false);
    expect(next.winner).toBe(0);
  });
});
