# Ticket Plan: P1-2 Deck and RNG Foundations

- **Status:** Done  
- **Last Updated:** 2026-01-02  
- **Owner:** AI Assistant  

## Summary
Implement deterministic card and deck helpers to provide the foundational building blocks for the engine. Generate standard 52-card decks, support multiple decks, and supply a deterministic shuffle driven by a seedable RNG so future rules and simulations can rely on reproducible ordering.

## Requirements Alignment
- Based on `memory-bank/plans/TICKETS.md` ticket P1-2 and architecture in `memory-bank/ARCHITECTURE.md`.  
- Card ranks 2..14 (Ace high) with four suits.  
- Deterministic shuffling via `seedrandom` or injectable RNG.  
- Tests must verify uniqueness and deterministic ordering.  

## Plan / Tasks
1. Define card and suit/rank types plus helpers to create ordered decks (supporting `numDecks`).  
2. Add RNG utilities wrapping `seedrandom` for injectable deterministic randomness.  
3. Implement Fisher-Yates shuffle that accepts an RNG and preserves determinism without mutating callers’ data.  
4. Provide helpers to generate shuffled decks from a seed.  
5. Add Vitest coverage: uniqueness of cards (52 per deck), deterministic shuffle with same seed, differing order with different seeds, and basic multiple-deck sizing.  

## Testing Strategy
- Run `pnpm test` to execute Vitest suites.  
- Run `pnpm lint` optionally to confirm lint config remains valid.  

## Notes / Risks
- Keep helpers pure and avoid side effects; future engine will reuse RNG abstraction.  
- Maintain NodeNext import style with explicit `.js` extensions.  

## Completion Notes
- Implemented card typing, deterministic RNG helper, deck creation with optional multiple decks, and Fisher-Yates shuffle with seeded RNG.  
- Added Vitest coverage for uniqueness, determinism, non-mutation, and multi-deck sizing.  
