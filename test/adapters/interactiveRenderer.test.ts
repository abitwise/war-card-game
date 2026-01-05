import chalk from 'chalk';
import { describe, expect, it, beforeEach } from 'vitest';
import { renderRoundEvents } from '../../src/adapters/interactiveRenderer.js';
import { playRound } from '../../src/engine/round.js';
import { createSeededRng } from '../../src/engine/rng.js';
import { createGameState } from '../../src/engine/state.js';

const createWarRound = () => {
  const state = createGameState({ playerNames: ['Alice', 'Bob'] });
  state.players[0].drawPile = [
    { rank: 9, suit: '♣' },
    { rank: 4, suit: '♣' },
    { rank: 12, suit: '♥' },
    { rank: 2, suit: '♠' },
  ];
  state.players[1].drawPile = [
    { rank: 9, suit: '♦' },
    { rank: 3, suit: '♦' },
    { rank: 5, suit: '♠' },
    { rank: 14, suit: '♠' },
  ];

  return playRound(state, createSeededRng('verbosity-war'));
};

describe('renderRoundEvents verbosity modes', () => {
  beforeEach(() => {
    chalk.level = 0;
  });

  it('summarizes winner and piles at low verbosity', () => {
    const round = createWarRound();
    const lines: string[] = [];

    renderRoundEvents(round.events, round.state, (line) => lines.push(line), 'low');

    expect(lines).toMatchInlineSnapshot(`
      [
        "",
        "Round 1",
        "Alice wins 6 card(s).",
        "Piles: Alice: draw 1, won 6, total 7 | Bob: draw 1, won 0, total 1",
      ]
    `);
  });

  it('shows war structure at normal verbosity', () => {
    const round = createWarRound();
    const lines: string[] = [];

    renderRoundEvents(round.events, round.state, (line) => lines.push(line), 'normal');

    expect(lines).toMatchInlineSnapshot(`
      [
        "",
        "Round 1",
        "Flip: Alice: 9♣ vs Bob: 9♦ (tie on 9)",
        "WAR! (level 1, tie on 9)",
        "Down: Alice: 🂠  Bob: 🂠",
        "Up: Alice: Q♥  Bob: 5♠  => Alice wins 6 card(s)",
        "Piles: Alice: draw 1, won 6, total 7 | Bob: draw 1, won 0, total 1",
      ]
    `);
  });

  it('includes full table ordering at high verbosity', () => {
    const round = createWarRound();
    const lines: string[] = [];

    renderRoundEvents(round.events, round.state, (line) => lines.push(line), 'high');

    expect(lines).toMatchInlineSnapshot(`
      [
        "",
        "Round 1",
        "Flip: Alice: 9♣ vs Bob: 9♦ (tie on 9)",
        "WAR! (level 1, tie on 9)",
        "Down: Alice: 🂠  Bob: 🂠",
        "Up: Alice: Q♥  Bob: 5♠  => Alice wins 6 card(s)",
        "Table: Alice: 9♣, 🂠, Q♥ | Bob: 9♦, 🂠, 5♠",
        "Piles: Alice: draw 1, won 6, total 7 | Bob: draw 1, won 0, total 1",
      ]
    `);
  });

  it('renders multi-player wars with only tied players participating', () => {
    const state = createGameState({ playerNames: ['A', 'B', 'C'] });
    state.players[0].drawPile = [
      { rank: 7, suit: '♠' },
      { rank: 4, suit: '♠' },
      { rank: 14, suit: '♣' },
    ];
    state.players[1].drawPile = [
      { rank: 7, suit: '♥' },
      { rank: 3, suit: '♥' },
      { rank: 13, suit: '♦' },
    ];
    state.players[2].drawPile = [
      { rank: 4, suit: '♦' },
      { rank: 9, suit: '♦' },
      { rank: 5, suit: '♠' },
    ];

    const round = playRound(state, createSeededRng('multi-war-render'));
    const lines: string[] = [];

    renderRoundEvents(round.events, round.state, (line) => lines.push(line), 'normal');

    expect(lines).toMatchInlineSnapshot(`
      [
        "",
        "Round 1",
        "Flip: A: 7♠ | B: 7♥ | C: 4♦ (tie on 7)",
        "WAR! (level 1, tie on 7)",
        "Down: A: 🂠  B: 🂠",
        "Up: A: A♣  B: K♦  => A wins 7 card(s)",
        "Piles: A: draw 0, won 7, total 7 | B: draw 0, won 0, total 0 | C: draw 2, won 0, total 2",
      ]
    `);
  });
});
