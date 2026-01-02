# Ticket Plan: P1-4 Round Resolution Engine

- **Status:** Done  
- **Last Updated:** 2026-01-02  
- **Owner:** AI Assistant  

## Summary
Implement the War round resolution engine that plays out a full battle (including chained wars) in a single step. The engine must consume the existing game state and rules, apply deterministic card flow (recycling/shuffling won piles when needed), and emit structured events describing the round outcome. Handle eliminations, winner detection, and safeguards like `maxRounds` while keeping the engine pure and configurable.

## Requirements Alignment
- Based on ticket P1-4 in `memory-bank/plans/TICKETS.md` plus architecture/product briefs.  
- Resolve a round by flipping cards for both players, comparing ranks (Ace high by default), and triggering wars on ties.  
- War handling: place `warFaceDownCount` face-down cards (or as many as available), then a face-up card; if a player cannot produce a face-up card, they lose the war/game.  
- Recycling: when draw pile is empty, recycle won pile into draw pile; shuffle if `shuffleWonPileOnRecycle` is true.  
- Collect behavior based on `collectMode` (`won-pile` vs `bottom-of-draw`).  
- Tie resolution option: `standard-war` (repeat wars) vs `sudden-death` (first higher face-up after tie wins without additional buildup).  
- Track and return updated game state plus events for rendering; include win detection and `maxRounds` timeout safeguards.

## Plan / Tasks
1. Define engine step/round resolver (e.g., `playRound`/`step`) that accepts `GameState` and RNG, returning new state and emitted events while keeping purity.  
2. Implement battle resolution logic: draw/recycle flows, face-down placements per rules, war chain handling (standard vs sudden-death), and collection into winner’s pile using configured ordering.  
3. Update stats (wars, flips, rounds), set game termination flags (winner, active=false, timeout via `maxRounds`).  
4. Add Vitest coverage for deterministic round outcomes: basic wins, war sequences, insufficient cards during war, recycling with/without shuffle, collect mode differences, tie-resolution variant behavior, and timeout handling.  
5. Ensure docs/plans/tests stay in sync with behavior; update ticket plan status on completion.

## Testing Strategy
- Run `pnpm test` for unit coverage.  
- Add focused suites under `test/engine` to validate round resolution edge cases.  
- Optionally run `pnpm lint` if time permits.

## Notes / Risks
- Keep engine pure and side-effect free; no console I/O in core logic.  
- Determinism depends on RNG usage during shuffles when recycling; ensure seeds are passed through for reproducibility.  
- War edge cases (insufficient cards) must match documented rule: place what you can; if no face-up available, that player loses.  
- `maxRounds` should halt games gracefully and report timeout rather than infinite loops.
