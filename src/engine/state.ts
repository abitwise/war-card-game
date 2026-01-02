import type { Card } from './cards.js';
import type { WarRules, WarRulesInput } from './rules.js';
import { validateWarRules } from './rules.js';

export type PlayerState = {
  name: string;
  drawPile: Card[];
  wonPile: Card[];
};

export type TableCard = {
  playerId: number;
  card: Card;
  faceDown: boolean;
};

export type TableState = {
  battleCards: TableCard[];
  inWar: boolean;
};

export type GameStats = {
  wars: number;
  flips: number;
};

export type GameState = {
  players: PlayerState[];
  table: TableState;
  round: number;
  active: boolean;
  winner?: number;
  stats: GameStats;
  config: WarRules;
};

export const createPlayerState = (name: string, drawPile: Card[] = [], wonPile: Card[] = []): PlayerState => ({
  name,
  drawPile: [...drawPile],
  wonPile: [...wonPile],
});

const dealDeckToPlayers = (deck: Card[], playerCount: number): Card[][] => {
  const piles: Card[][] = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, index) => {
    piles[index % playerCount].push(card);
  });
  return piles;
};

type CreateGameStateOptions = {
  playerNames?: string[];
  deck?: Card[];
  rules?: WarRulesInput;
};

export const createGameState = (options: CreateGameStateOptions = {}): GameState => {
  const { playerNames = ['Player 1', 'Player 2'], deck = [], rules } = options;
  const playerCount = playerNames.length;
  const piles = deck.length > 0 ? dealDeckToPlayers(deck, playerCount) : Array.from({ length: playerCount }, () => []);

  const players = playerNames.map((name, index) => createPlayerState(name, piles[index]));

  return {
    players,
    table: { battleCards: [], inWar: false },
    round: 1,
    active: true,
    winner: undefined,
    stats: { wars: 0, flips: 0 },
    config: validateWarRules(rules),
  };
};
