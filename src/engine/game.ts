import { createDeck, shuffleDeck } from './deck.js';
import type { RNG } from './rng.js';
import { createSeededRng } from './rng.js';
import type { RoundEvent, RoundResult } from './round.js';
import { playRound } from './round.js';
import type { WarRulesInput } from './rules.js';
import { validateWarRules } from './rules.js';
import type { GameState } from './state.js';
import { createGameState } from './state.js';

export type RunGameOptions = {
  seed: string;
  playerNames?: string[];
  rules?: WarRulesInput;
  onGameStart?: (state: GameState) => void;
  onRound?: (result: RoundResult) => void;
  collectEvents?: boolean;
};

export type GameRunResult = {
  seed: string;
  state: GameState;
  events: RoundEvent[];
};

export const createGame = (options: RunGameOptions): { state: GameState; rng: RNG } => {
  const rng = createSeededRng(options.seed);
  const config = validateWarRules(options.rules);
  const deck = shuffleDeck(createDeck(config.numDecks), rng);

  return {
    rng,
    state: createGameState({
      playerNames: options.playerNames,
      deck,
      rules: config,
    }),
  };
};

export const runGame = (options: RunGameOptions): GameRunResult => {
  const { rng, state: initialState } = createGame(options);
  const captureEvents = options.collectEvents ?? true;
  const events: RoundEvent[] = [];

  options.onGameStart?.(initialState);

  let state = initialState;
  while (state.active) {
    const result = playRound(state, rng);
    options.onRound?.(result);
    if (captureEvents) {
      events.push(...result.events);
    }
    state = result.state;
  }

  return { seed: options.seed, state, events };
};
