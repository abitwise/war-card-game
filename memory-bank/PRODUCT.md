# Product Brief

The War card game service provides a CLI-first experience for playing and simulating the classic “War” card game. It targets fast local play, reproducible simulations, and a clear separation between a pure game engine and interactive rendering. The default experience is a player-vs-CPU match, with optional multi-game simulations for analytics. Plans prioritize a straightforward interactive CLI using `@inquirer/prompts` before exploring richer TUIs.

## Capabilities / Features
- Interactive CLI play with step-by-step rounds and simple controls.
- Deterministic simulations with seeding for reproducible outcomes.
- Configurable rules (war depth, max rounds, collect mode, tie resolution).
- Event-driven engine output for reuse across UI/logging layers.
- Aggregate simulation reporting (wins, rounds, wars, timeouts).

## Stakeholders / User Types
- Players who want a quick terminal-based War game.
- Developers extending rules, analytics, or UI skins.
- QA/analysts running deterministic simulations.
- Maintainership team ensuring determinism and rule consistency.

## Key User Flows
- As a player, I start `war play` with defaults to battle a CPU so that I can enjoy a quick game without setup.
- As a player, I adjust war depth or seed to explore rule variants so that I can experiment with house rules.
- As an analyst, I run `war simulate --games N --json` so that I can gather aggregate stats for many runs.
- As a developer, I hook into engine events so that I can render rounds or log outcomes without changing core logic.
- As a QA engineer, I replay a seed to reproduce a reported issue so that I can debug deterministically.

## Business Rules / Invariants
- Default mode is player-vs-CPU with standard War rules (Ace high, 1 face-down in war).
- Engine must remain pure and deterministic when provided a seed; no hidden randomness.
- Rule changes must be reflected in documentation and tests before adoption.
- Collecting behavior and tie handling should be configurable but have sensible defaults documented.
- Simulations must guard against infinite games using a `maxRounds` safeguard.
