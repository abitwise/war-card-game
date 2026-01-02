import type { Card } from './cards.js';
import { RANKS, SUITS } from './cards.js';
import type { RNG } from './rng.js';
import { createSeededRng } from './rng.js';

export const createDeck = (numDecks = 1): Card[] => {
  if (numDecks < 1) {
    throw new Error('numDecks must be at least 1');
  }

  const deck: Card[] = [];
  for (let deckIndex = 0; deckIndex < numDecks; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
  }
  return deck;
};

export const shuffleDeck = (cards: Card[], rng: RNG): Card[] => {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const createShuffledDeck = (seed: string, numDecks = 1): Card[] => {
  const rng = createSeededRng(seed);
  const deck = createDeck(numDecks);
  return shuffleDeck(deck, rng);
};
