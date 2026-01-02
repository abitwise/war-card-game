# Ticket Plan: P1-3 Game State and Rules Model

- **Status:** Done  
- **Last Updated:** 2026-01-02  
- **Owner:** AI Assistant  

## Summary
Define the War rules configuration, player/game/table state models, and default values so the engine and CLI have consistent contracts. Include validation for core options and ensure defaults match documented classic War behavior.

## Requirements Alignment
- Derived from ticket P1-3 in `memory-bank/plans/TICKETS.md` and architecture/product briefs.  
- Defaults: Ace high, `warFaceDownCount = 1`, collect to won pile, shuffle on recycle, optional `maxRounds` safeguard, tieResolution options (`standard-war` | `sudden-death`), `collectMode` (`bottom-of-draw` | `won-pile`).  
- Provide types/interfaces for WarRules, PlayerState, TableState, GameState.  
- Validation allowed (zod optional).  

## Plan / Tasks
1. Define `WarRules` type and `defaultWarRules` constant with documented defaults; include validation helper for rule options.  
2. Define `PlayerState`, `TableState`, `GameState` structures aligning with architecture data contracts and include stats scaffolding (wars, flips, rounds).  
3. Provide creation helpers (e.g., `createGameState`) that initialize players and table with defaults and validated rules.  
4. Add Vitest coverage for defaults (Ace high, warFaceDownCount 1, collect mode, shuffle flag, tieResolution, maxRounds optional) and basic validation behavior.  

## Testing Strategy
- Run `pnpm test` for unit coverage.  
- Optionally run `pnpm lint` to ensure typing/linting remains clean.  

## Notes / Risks
- Keep the engine pure; avoid I/O.  
- Ensure data shapes are stable for upcoming engine/CLI tickets.  

## Completion Notes
- Added war rule types with defaults and validation for deterministic, safe configuration (including maxRounds safeguard).  
- Implemented game/player/table state constructors with deterministic deck dealing helper.  
- Added tests covering defaults, validation failures, rule overrides, and initial game state setup.  
