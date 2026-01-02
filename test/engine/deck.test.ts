import { describe, expect, it } from 'vitest';
import type { Card } from '../../src/engine/cards.js';
import { createDeck, createShuffledDeck, shuffleDeck } from '../../src/engine/deck.js';
import { createSeededRng } from '../../src/engine/rng.js';

const cardKey = (card: Card): string => `${card.rank}${card.suit}`;

describe('deck generation', () => {
  it('creates a standard 52-card deck with unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);

    const unique = new Set(deck.map(cardKey));
    expect(unique.size).toBe(52);
  });

  it('supports multiple decks', () => {
    const deck = createDeck(2);
    expect(deck).toHaveLength(104);

    const counts: Record<string, number> = {};
    for (const card of deck) {
      const key = cardKey(card);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    expect(Object.values(counts).every((count) => count === 2)).toBe(true);
  });
});

describe('deterministic shuffling', () => {
  it('produces the same order with the same seed', () => {
    const deck = createDeck();
    const rngA = createSeededRng('test-seed');
    const rngB = createSeededRng('test-seed');

    const shuffledA = shuffleDeck(deck, rngA);
    const shuffledB = shuffleDeck(deck, rngB);

    expect(shuffledA).toEqual(shuffledB);
  });

  it('produces different order with different seeds', () => {
    const deck = createDeck();
    const shuffledA = shuffleDeck(deck, createSeededRng('seed-a'));
    const shuffledB = shuffleDeck(deck, createSeededRng('seed-b'));

    expect(shuffledA).not.toEqual(shuffledB);
  });

  it('does not mutate the original deck', () => {
    const deck = createDeck();
    const copy = [...deck];

    shuffleDeck(deck, createSeededRng('seed-mutation'));
    expect(deck).toEqual(copy);
  });

  it('creates a deterministic shuffled deck from seed', () => {
    const shuffled = createShuffledDeck('inline-seed');
    const expected = shuffleDeck(createDeck(), createSeededRng('inline-seed'));

    expect(shuffled).toEqual(expected);
  });
});
