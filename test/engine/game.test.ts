import { describe, expect, it } from 'vitest';
import { runGame } from '../../src/engine/game.js';

describe('runGame', () => {
  it('produces deterministic results for the same seed', () => {
    const first = runGame({ seed: 'deterministic-seed' });
    const second = runGame({ seed: 'deterministic-seed' });

    expect(second.state.winner).toBe(first.state.winner);
    expect(second.state.stats).toEqual(first.state.stats);
    expect(second.state.round).toBe(first.state.round);
  });

  it('respects maxRounds timeouts', () => {
    const result = runGame({ seed: 'timeout-check', rules: { maxRounds: 1 } });
    const endings = result.events.filter((event) => event.type === 'GameEnded');

    expect(result.state.active).toBe(false);
    expect(endings.some((event) => event.reason === 'timeout')).toBe(true);
  });

  it('remains deterministic with four players', () => {
    const first = runGame({ seed: 'four-player-determinism', playerNames: ['P1', 'P2', 'P3', 'P4'] });
    const second = runGame({ seed: 'four-player-determinism', playerNames: ['P1', 'P2', 'P3', 'P4'] });

    expect(second.state.winner).toBe(first.state.winner);
    expect(second.state.round).toBe(first.state.round);
    expect(second.state.players.map((player) => player.drawPile.length + player.wonPile.length)).toEqual(
      first.state.players.map((player) => player.drawPile.length + player.wonPile.length),
    );
  });
});
