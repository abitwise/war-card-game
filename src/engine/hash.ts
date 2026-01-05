import { createHash } from 'node:crypto';
import type { Card } from './cards.js';
import type { GameState } from './state.js';

export type StateHashMode = 'off' | 'counts' | 'full';

type ActiveStateHashMode = Exclude<StateHashMode, 'off'>;

const serializeCard = (card: Card): string => `${card.rank}${card.suit}`;

const canonicalState = (state: GameState, mode: ActiveStateHashMode) => ({
  round: state.round,
  players: state.players.map((player, index) =>
    mode === 'counts'
      ? { id: index, draw: player.drawPile.length, won: player.wonPile.length }
      : {
          id: index,
          draw: player.drawPile.map(serializeCard),
          won: player.wonPile.map(serializeCard),
        },
  ),
});

export const hashState = (state: GameState, mode: ActiveStateHashMode): string => {
  const snapshot = canonicalState(state, mode);
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
};
