import { shuffleDeck } from './deck.js';
import type { StateHashMode } from './hash.js';
import { hashState } from './hash.js';
import type { RNG } from './rng.js';
import type { GameState, TableCard } from './state.js';

export type RoundEvent =
  | { type: 'RoundStarted'; round: number }
  | { type: 'CardsPlaced'; cards: TableCard[]; participants?: number[] }
  | { type: 'WarStarted'; warLevel: number; participants?: number[] }
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

  const activePlayers = state.players
    .map((player, index) => ({ index, cards: totalCards(player) }))
    .filter((entry) => entry.cards > 0)
    .map((entry) => entry.index);

  const handleNoContest = (): RoundResult => {
    state.round += 1;
    state.active = false;
    state.table.inWar = false;
    events.push({ type: 'GameEnded', reason: 'stalemate' });
    pushHashEvent();
    return { state, events };
  };

  if (activePlayers.length === 0) {
    return handleNoContest();
  }
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    state.round += 1;
    state.active = false;
    state.winner = winner;
    events.push({ type: 'GameEnded', reason: 'win', winner });
    pushHashEvent();
    return { state, events };
  }

  const faceUps: TableCard[] = [];
  activePlayers.forEach((playerId) => {
    const card = drawFaceUp(playerId);
    if (card) {
      faceUps.push(card);
    }
  });

  const highestRank = faceUps.reduce((max, entry) => Math.max(max, entry.card.rank), -Infinity);
  const contenders = faceUps.filter((entry) => entry.card.rank === highestRank).map((entry) => entry.playerId);

  let roundWinner: number | undefined = contenders.length === 1 ? contenders[0] : undefined;
  let warParticipants: number[] = [...contenders];

  while (roundWinner === undefined && warParticipants.length > 1) {
    warLevel += 1;
    state.table.inWar = true;
    state.stats.wars += 1;
    events.push({ type: 'WarStarted', warLevel, participants: [...warParticipants] });

    const warFaceUps: TableCard[] = [];
    warParticipants.forEach((playerId) => {
      const faceUp =
        state.config.tieResolution === 'sudden-death' ? drawFaceUp(playerId) : drawWarPackage(playerId);
      if (faceUp) {
        warFaceUps.push(faceUp);
      }
    });

    const warHighestRank = warFaceUps.reduce((max, entry) => Math.max(max, entry.card.rank), -Infinity);
    const tied = warFaceUps.filter((entry) => entry.card.rank === warHighestRank).map((entry) => entry.playerId);

    if (tied.length === 0) {
      break;
    }
    if (tied.length === 1) {
      roundWinner = tied[0];
      break;
    }
    warParticipants = tied;
  }

  if (roundWinner === undefined) {
    return handleNoContest();
  }

  const participantsForRound = activePlayers;
  const collected = [...state.table.battleCards];
  collectCards(state, roundWinner, collected);
  events.push({ type: 'CardsPlaced', cards: collected, participants: participantsForRound });
  events.push({ type: 'TrickWon', winner: roundWinner, collected });

  state.round += 1;
  state.table = { battleCards: [], inWar: false };

  const remainingPlayers = state.players
    .map((player, index) => ({ index, cards: totalCards(player) }))
    .filter((entry) => entry.cards > 0)
    .map((entry) => entry.index);

  if (remainingPlayers.length === 1 && totalCards(state.players[remainingPlayers[0]]) > 0) {
    state.active = false;
    state.winner = remainingPlayers[0];
    events.push({ type: 'GameEnded', reason: 'win', winner: remainingPlayers[0] });
  } else if (remainingPlayers.length === 0) {
    state.active = false;
    events.push({ type: 'GameEnded', reason: 'stalemate' });
  } else if (state.config.maxRounds !== undefined && state.round > state.config.maxRounds) {
    state.active = false;
    events.push({ type: 'GameEnded', reason: 'timeout' });
  }

  pushHashEvent();
  return { state, events };
};
