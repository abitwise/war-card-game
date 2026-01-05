import { shuffleDeck } from './deck.js';
import type { StateHashMode } from './hash.js';
import { hashState } from './hash.js';
import type { RNG } from './rng.js';
import type { GameState, TableCard } from './state.js';

export type RoundEvent =
  | { type: 'RoundStarted'; round: number }
  | { type: 'CardsPlaced'; cards: TableCard[] }
  | { type: 'WarStarted'; warLevel: number }
  | { type: 'PileRecycled'; playerId: number; cards: number; shuffled: boolean }
  | { type: 'TrickWon'; winner: number; collected: TableCard[] }
  | { type: 'StateHashed'; round: number; mode: Exclude<StateHashMode, 'off'>; hash: string }
  | { type: 'GameEnded'; reason: 'win' | 'timeout' | 'stalemate'; winner?: number };

export type RoundResult = {
  state: GameState;
  events: RoundEvent[];
};

const cloneState = (state: GameState): GameState => ({
  ...state,
  players: state.players.map((player) => ({
    name: player.name,
    drawPile: [...player.drawPile],
    wonPile: [...player.wonPile],
  })),
  table: { battleCards: [], inWar: false },
  stats: { ...state.stats },
});

const totalCards = (player: { drawPile: unknown[]; wonPile: unknown[] }): number =>
  player.drawPile.length + player.wonPile.length;

const recycleIfNeeded = (state: GameState, playerId: number, rng: RNG, events: RoundEvent[]) => {
  const player = state.players[playerId];
  if (player.drawPile.length > 0 || player.wonPile.length === 0) {
    return;
  }

  const recycled = state.config.shuffleWonPileOnRecycle ? shuffleDeck(player.wonPile, rng) : [...player.wonPile];
  player.wonPile = [];
  player.drawPile = recycled;
  events.push({
    type: 'PileRecycled',
    playerId,
    cards: recycled.length,
    shuffled: state.config.shuffleWonPileOnRecycle,
  });
};

const drawCardToTable = (
  state: GameState,
  playerId: number,
  faceDown: boolean,
  rng: RNG,
  events: RoundEvent[],
): TableCard | undefined => {
  recycleIfNeeded(state, playerId, rng, events);
  const player = state.players[playerId];
  const card = player.drawPile.shift();
  if (!card) {
    return undefined;
  }
  const tableCard: TableCard = { playerId, card, faceDown };
  state.table.battleCards.push(tableCard);
  if (!faceDown) {
    state.stats.flips += 1;
  }
  return tableCard;
};

const collectCards = (state: GameState, winnerId: number, cards: TableCard[]) => {
  const player = state.players[winnerId];
  if (state.config.collectMode === 'bottom-of-draw') {
    player.drawPile.push(...cards.map((entry) => entry.card));
  } else {
    player.wonPile.push(...cards.map((entry) => entry.card));
  }
};

const determineRoundWinner = (faceUpA: TableCard, faceUpB: TableCard): number | undefined => {
  if (faceUpA.card.rank === faceUpB.card.rank) {
    return undefined;
  }
  return faceUpA.card.rank > faceUpB.card.rank ? faceUpA.playerId : faceUpB.playerId;
};

export const playRound = (inputState: GameState, rng: RNG, stateHashMode: StateHashMode = 'off'): RoundResult => {
  if (!inputState.active) {
    return { state: inputState, events: [] };
  }

  if (inputState.config.maxRounds !== undefined && inputState.round > inputState.config.maxRounds) {
    const timedOut: GameState = { ...inputState, active: false };
    return {
      state: timedOut,
      events: [{ type: 'GameEnded', reason: 'timeout' }],
    };
  }

  const currentRound = inputState.round;
  const state = cloneState(inputState);
  const events: RoundEvent[] = [{ type: 'RoundStarted', round: currentRound }];
  let warLevel = 0;

  const pushHashEvent = () => {
    if (stateHashMode === 'off') {
      return;
    }
    const mode: Exclude<StateHashMode, 'off'> = stateHashMode === 'full' ? 'full' : 'counts';
    const hash = hashState({ ...state, round: currentRound }, mode);
    events.push({ type: 'StateHashed', round: currentRound, mode, hash });
  };

  const drawFaceUp = (playerId: number): TableCard | undefined =>
    drawCardToTable(state, playerId, false, rng, events);

  const drawWarPackage = (playerId: number): TableCard | undefined => {
    for (let i = 0; i < state.config.warFaceDownCount; i += 1) {
      drawCardToTable(state, playerId, true, rng, events);
    }
    return drawFaceUp(playerId);
  };

  const initialA = drawFaceUp(0);
  const initialB = drawFaceUp(1);
  if (!initialA && !initialB) {
    state.round += 1;
    state.active = false;
    events.push({ type: 'GameEnded', reason: 'stalemate' });
    pushHashEvent();
    return { state, events };
  }
  if (!initialA || !initialB) {
    const winner = initialA ? 0 : 1;
    const collected = [...state.table.battleCards];
    collectCards(state, winner, state.table.battleCards);
    state.round += 1;
    state.winner = winner;
    state.active = false;
    state.table.battleCards = [];
    state.table.inWar = false;
    events.push({ type: 'TrickWon', winner, collected });
    events.push({ type: 'GameEnded', reason: 'win', winner });
    pushHashEvent();
    return { state, events };
  }

  let roundWinner: number | undefined = determineRoundWinner(initialA, initialB);

  while (roundWinner === undefined) {
    warLevel += 1;
    state.table.inWar = true;
    state.stats.wars += 1;
    events.push({ type: 'WarStarted', warLevel });

    if (state.config.tieResolution === 'sudden-death') {
      const nextA = drawFaceUp(0);
      const nextB = drawFaceUp(1);
      if (!nextA || !nextB) {
        roundWinner = nextA ? 0 : nextB ? 1 : undefined;
        break;
      }
      roundWinner = determineRoundWinner(nextA, nextB);
      continue;
    }

    const warA = drawWarPackage(0);
    const warB = drawWarPackage(1);
    if (!warA || !warB) {
      roundWinner = warA ? 0 : warB ? 1 : undefined;
      break;
    }
    roundWinner = determineRoundWinner(warA, warB);
  }

  if (roundWinner === undefined) {
    state.round += 1;
    state.active = false;
    events.push({ type: 'GameEnded', reason: 'stalemate' });
    pushHashEvent();
    return { state, events };
  }

  collectCards(state, roundWinner, state.table.battleCards);
  events.push({ type: 'CardsPlaced', cards: [...state.table.battleCards] });
  events.push({ type: 'TrickWon', winner: roundWinner, collected: [...state.table.battleCards] });

  const otherPlayer = roundWinner === 0 ? 1 : 0;
  const winnerCards = totalCards(state.players[roundWinner]);
  const loserCards = totalCards(state.players[otherPlayer]);

  state.round += 1;

  if (loserCards === 0 && winnerCards > 0) {
    state.active = false;
    state.winner = roundWinner;
    state.table = { battleCards: [], inWar: false };
    events.push({ type: 'GameEnded', reason: 'win', winner: roundWinner });
  } else {
    state.table = { battleCards: [], inWar: false };
    if (state.config.maxRounds !== undefined && state.round > state.config.maxRounds) {
      state.active = false;
      events.push({ type: 'GameEnded', reason: 'timeout' });
    }
  }

  pushHashEvent();
  return { state, events };
};
