# Architecture Overview

This service is a TypeScript/Node.js CLI application that separates a pure War game engine from presentation layers. The engine produces deterministic events that interactive and simulation modes consume. Two modes are targeted: (1) non-interactive simulation for batch stats and (2) interactive CLI play using `@inquirer/prompts` (with the option to evolve into a richer TUI later).

## Main Components
- **Engine Core (`src/engine`)**: Pure logic for cards, deck generation/shuffle, rules, game state, and round resolution. Exposes `createGame`, `playRound/step`, and `run` helpers that emit events.
- **CLI Commands (`src/cli/commands`)**: Commander-driven entrypoints for `play` (interactive) and `simulate` (batch). Owns argument parsing and wiring to the engine.
- **Renderers/Adapters (`src/adapters`)**: Translate engine events into human-readable output (interactive prompts, logging). Keeps I/O out of the engine.
- **Format Helpers (`src/cli/format`)**: Utilities for consistent text/ANSI formatting (chalk, tabular helpers).
- **Tests (`test/`)**: Vitest suites covering engine rules, determinism, and CLI behaviors.

## External Integrations
- **`@inquirer/prompts`**: Primary interactive CLI input method; used for per-round actions and menus.
- **`commander`**: CLI command and option parsing.
- **`chalk`**: Colorized output for readability.
- **`seedrandom`**: Deterministic RNG for shuffling and simulations.
- **Optional:** `ora` for loading states, `log-update` for live refresh, `ink` for future TUI.

## Data Models / Contracts
- **Card**: `{ rank: 2..14; suit: '♠'|'♥'|'♦'|'♣' }` (Ace high by default).
- **PlayerState**: `{ name: string; drawPile: Card[]; wonPile: Card[] }`.
- **TableState**: `{ battleCards: { playerId: number; card: Card; faceDown: boolean }[]; inWar: boolean }`.
- **GameState**: `{ players: PlayerState[]; round: number; active: boolean; winner?: number; stats: { wars: number; flips: number }; config: WarRules }`.
- **WarRules**: `{ numDecks: 1; warFaceDownCount: 1; collectMode: 'bottom-of-draw' | 'won-pile'; shuffleWonPileOnRecycle: true; maxRounds?: number; tieResolution: 'standard-war' | 'sudden-death'; aceHigh: true }`.
- **Events** (examples): `RoundStarted`, `CardsFlipped`, `WarStarted`, `WarCardsPlaced`, `TrickWon`, `PileRecycled`, `GameEnded`. Events drive UI/logging without embedding I/O in the engine.

## Design Decisions
- **Pure engine, I/O adapters**: Enables reuse across interactive and simulation modes and simplifies testing.
- **Deterministic RNG via seeds**: Critical for debugging and reproducible analytics.
- **Configurable rules with safe defaults**: Keeps house-rule variants possible without diverging from classic play.
- **Event-driven rendering**: UI layers subscribe to events rather than peeking into internal state.
- **Round-level stepping**: Each `step` resolves a full battle (including nested wars) to keep interactive flow understandable.
- **Timeout guard**: `maxRounds` prevents infinite games in simulation or autoplay.
