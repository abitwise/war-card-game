# Tickets

## Phase 1 (Done)

### [P1-1] Project Tooling and Scaffolding
- Status: Done
- Summary: Initialize TypeScript Node CLI project with baseline tooling and scripts.
- Context: Needed to run dev commands, build, and test the future engine/CLI.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an empty repo, WHEN dependencies are installed, THEN scripts `dev`, `build`, `test`, and `simulate` are available.
- Technical notes:
  - Use `pnpm` (or npm) with `tsx`, `typescript`, `commander`, `@inquirer/prompts`, `chalk`, `seedrandom`, `vitest`, `eslint`, `prettier`.
  - Configure `tsconfig` for NodeNext/ES2022; add `bin` entry for CLI.
- Tasks:
  - [x] Add `package.json` with scripts and bin entry.
  - [x] Configure `tsconfig.json`, `eslint`, `prettier`.
  - [x] Add basic folder scaffold under `src/` and `test/`.

### [P1-2] Deck and RNG Foundations
- Status: Done
- Summary: Implement cards, deck generation, and deterministic shuffling.
- Context: Core building block for engine and simulations.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a seed, WHEN a deck is generated and shuffled, THEN results are deterministic and contain 52 unique cards per deck.
- Technical notes:
  - Card ranks 2..14 (Ace high), four suits.
  - Use `seedrandom` or injectable RNG interface.
- Tasks:
  - [x] Implement `Card`, `Deck` helpers with deterministic shuffle.
  - [x] Add tests for uniqueness and deterministic ordering.

### [P1-3] Game State and Rules Model
- Status: Done
- Summary: Define War rules/config, game state shape, and defaults.
- Context: Needed for engine consistency and CLI option mapping.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN default rules, WHEN a game is created, THEN config matches documented defaults (Ace high, war down count 1, collect to won pile, shuffle on recycle, maxRounds safeguard).
- Technical notes:
  - Include tieResolution option (`standard-war` vs `sudden-death`), collect mode, max rounds.
- Tasks:
  - [x] Implement `WarRules`, `GameState`, `PlayerState`, `TableState`.
  - [x] Provide defaults and validation (zod optional).

### [P1-4] Round Resolution Engine
- Status: Done
- Summary: Implement `playRound/step` resolving a full battle including wars.
- Context: Core gameplay for both interactive and simulation flows.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN two players with cards, WHEN a round is played, THEN the highest card wins; ties trigger war with configured face-down count; inability to continue war results in loss per documented rule.
- Technical notes:
  - Support recycling won pile when draw pile empty (optional shuffle).
  - Decide and document behavior when player lacks enough cards during war (use “place what you can; if no face-up, you lose”).
- Tasks:
  - [x] Implement round resolution returning new state plus events.
  - [x] Handle elimination and winner detection.
  - [x] Add tests for wars, recycling, and edge cases.

### [P1-5] Simulation CLI Command
- Status: Done
- Summary: Add `war simulate` command to run N games and report aggregates.
- Context: Enables analytics and regression checks.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `--games N`, WHEN command runs, THEN it outputs win counts, average rounds, wars per game, and timeouts; supports `--json`/`--csv`.
- Technical notes:
  - Use `commander`; leverage engine `run` function; support seed base pattern (seed + index).
- Tasks:
  - [x] Implement command wiring and output formatting.
  - [x] Add tests for argument parsing and deterministic results.

### [P1-6] Interactive Play CLI
- Status: Done
- Summary: Add `war play` interactive mode with default player-vs-CPU and `@inquirer/prompts`.
- Context: Primary user-facing experience.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN the CLI, WHEN user runs `war play`, THEN they can advance rounds, view pile counts, handle wars visibly, and quit or autoplay.
- Technical notes:
  - Controls: Enter (next), a (autoplay), s (stats), q (quit), ? (help).
  - Render events clearly; consider `chalk` for emphasis.
- Tasks:
  - [x] Wire prompts to engine steps.
  - [x] Add renderer for per-round output.
  - [x] Add smoke tests or snapshot coverage for CLI output.

### [P1-7] Packaging and Docs
- Status: Done
- Summary: Final polish for installable CLI and documentation.
- Context: Ensures usability and discoverability.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN repository build, WHEN published/installed, THEN CLI is runnable via bin entry; README documents usage and examples.
- Technical notes:
  - Update README with examples; ensure build output in `dist/`.
- Tasks:
  - [x] Configure build artifacts and bin target.
  - [x] Document CLI usage and options.
  - [x] Verify `maxRounds` and default rules are documented.

### [F1-1] Enhanced TUI with Ink
- Status: Done
- Summary: Optional richer TUI experience using `ink`.
- Context: Provide a more dynamic interface once core CLI is solid.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `war play --ui ink`, WHEN invoked, THEN users see a live-updating interface without prompts.
- Technical notes:
  - Leverage existing event stream; keep engine untouched.
- Tasks:
  - [x] Add flag and renderer; ensure compatibility with autoplay.

## Phase 2 (Next) — Visibility, Traces, and Simulation Analytics

### [P2-1] Trace Schema + Streaming Writer (JSONL)
- Status: Done
- Summary: Add a compact, append-only trace format that captures full game history as a first-class artifact.
- Context: The game is mostly about simulation; traces enable inspection, sharing, replay, and debugging.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a run with `--trace path`, WHEN the game runs, THEN a trace file is written containing metadata and per-round events in order.
  - GIVEN a large simulation run, WHEN tracing is enabled, THEN the app does not accumulate full traces in memory (streaming write).
- Technical notes:
  - Format: JSONL (one JSON object per line) for streaming and partial reads.
  - Trace header line: `{ type: "meta", version, engineVersion, timestamp, seed, rules, cliArgs, players, maxRounds }`
  - Event lines: `{ type: "event", round, event: <EngineEvent> }`
  - Optional: `{ type: "snapshot", round, pileCounts, (optional) topCards }` behind flags.
  - Add CLI flags:
    - `war play --trace out/game.jsonl`
    - `war simulate --trace out/games.jsonl --trace-mode single|sampled`
    - `--trace-sample-rate 0.01` OR `--trace-game-index 123`
- Tasks:
  - [x] Define `TraceRecord` types and versioned schema.
  - [x] Implement `TraceWriter` (streaming, flush on exit).
  - [x] Wire `--trace*` flags into `play` and `simulate`.
  - [x] Add tests: trace contains meta + ordered events for a known seed.
  - [x] Document trace format in README (or docs section).

### [P2-2] Trace View + Replay Commands
- Status: Done
- Summary: Add commands to render traces for humans and to replay traces deterministically.
- Context: Traces become valuable only when they can be consumed easily.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a trace file, WHEN user runs `war trace view file`, THEN it prints a readable summary (rounds, wars, winner, key moments).
  - GIVEN a trace file, WHEN user runs `war trace replay file`, THEN it replays round-by-round with the same outputs as live play (subject to verbosity).
- Technical notes:
  - Commands:
    - `war trace view <file> [--from 1 --to 200] [--only wars|wins|recycles]`
    - `war trace replay <file> [--speed ...] [--pause-on-war] [--verbosity ...]`
  - Replay strategy:
    - Start from meta (seed + rules) and re-run engine while verifying event equality; OR
    - Replay from recorded events (render-only) when strict verification isn’t required.
  - Provide an option: `--verify` to compare live-generated events to trace events (fails fast on mismatch).
- Tasks:
  - [x] Add `trace` command group in commander.
  - [x] Implement `view` (summary + filters).
  - [x] Implement `replay` (render loop, speed controls, pause-on-war).
  - [x] Implement optional `--verify` (event-by-event check).
  - [x] Add tests: replay/verify passes for fixed seed trace.

### [P2-3] Renderer Verbosity + “Feel the Battle” Visibility
- Status: Done
- Summary: Improve card visibility with configurable verbosity modes and clearer war/battle presentation.
- Context: War is fun to watch when you can follow “what happened” and “why”.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `--verbosity low`, WHEN a round plays, THEN output focuses on winner and pile counts only.
  - GIVEN `--verbosity normal`, WHEN a round plays, THEN it shows face-up flips and war structure with face-down placeholders.
  - GIVEN `--verbosity high`, WHEN a round plays, THEN it prints full played-card ordering (with face-down hidden as 🂠).
- Technical notes:
  - Keep engine unchanged; this is renderer/adapters work.
  - Add a consistent war visualization (indentation or ladder):
    - Flip: A: K♣ vs B: 7♦
    - WAR: (tie on 9)
    - Down: A: 🂠  B: 🂠
    - Up:   A: Q♥  B: 5♠  => A wins 6 cards
- Tasks:
  - [ ] Add `--verbosity` to `play` and `trace replay`.
  - [ ] Improve formatting helpers for cards, piles, and war sequences.
  - [ ] Add snapshot/smoke tests for representative outputs.

### [P2-4] Advanced Simulation Stats (Distributions + Extremes)
- Status: Done
- Summary: Add stats that explain run shape (not only averages) and identify “weird” games.
- Context: Simulation is the core value; distributions and extremes help interpret behavior.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `war simulate --games N`, WHEN completed, THEN it outputs p50/p90/p99 rounds, war depth distribution, and extremes (longest game, biggest war, biggest swing).
  - GIVEN `--hist`, WHEN enabled, THEN it prints ASCII histograms for rounds and wars/game.
- Technical notes:
  - Track per-game metrics during simulation (constant-memory aggregates + optional store for percentile calc).
  - Percentiles approach:
    - Store rounds for all games if N is reasonable; OR
    - Use streaming quantile estimator (optional later).
  - Outputs:
    - existing `--json/--csv` extended with new fields
    - optional `--md` for Confluence-friendly tables
- Tasks:
  - [ ] Extend simulation metrics model (rounds, wars, maxWarDepth, leadChanges, recycles).
  - [ ] Implement percentiles + histogram output.
  - [ ] Add “interesting moments” section (top-N).
  - [ ] Add tests for deterministic stats on fixed seed sets.

### [P2-5] Playback Controls: Speed Toggle + Pause-on-War
- Status: Backlog
- Summary: Enhance “watching” mode with speed control and pause when wars occur.
- Context: Improves visibility for both live play and trace replay.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `--speed 5`, WHEN autoplay is active, THEN rounds advance faster with reduced delay.
  - GIVEN `--pause-on-war`, WHEN a war starts, THEN autoplay pauses and waits for user action.
- Technical notes:
  - Apply to:
    - `war play` (interactive autoplay)
    - `war trace replay`
    - (if available) `--ui ink` renderer as well
  - Speed model:
    - Accept `--speed` as multiplier OR `--delay-ms` for explicit timing.
- Tasks:
  - [ ] Add CLI flags `--speed` and `--pause-on-war`.
  - [ ] Update interactive loop to respect speed/delay.
  - [ ] Implement war-detection hook from event stream.
  - [ ] Add coverage for pause-on-war behavior (unit test with simulated events).

### [P2-6] Deterministic State Hashing (Correctness + Regression)
- Status: Backlog
- Summary: Add canonical hashing of game state per round to validate determinism and replay correctness.
- Context: Great for regression tests and ensuring traces remain trustworthy.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `--state-hash counts`, WHEN rounds advance, THEN output/trace includes a hash derived from canonical pile counts and round number.
  - GIVEN `--state-hash full`, WHEN enabled, THEN hash includes full pile contents in canonical order.
  - GIVEN `war trace replay --verify`, WHEN enabled, THEN state hashes must match (fail fast on mismatch).
- Technical notes:
  - Hash algorithm: SHA-256.
  - Canonical serialization:
    - Stable ordering of players, piles, and cards (rank+suit).
    - No whitespace ambiguity (JSON stable stringify or custom serializer).
  - Emit as an event (e.g., `StateHashed`) so adapters can log/store it without engine I/O.
- Tasks:
  - [ ] Implement `hashState(state, mode)` in engine (pure).
  - [ ] Add `StateHashed` event (or attach hash to RoundEnded event).
  - [ ] Add CLI flag(s) `--state-hash off|counts|full`.
  - [ ] Add regression tests: fixed seed => expected hash sequence for first N rounds.

### [P2-7] Docs & Examples Update
- Status: Backlog
- Summary: Document trace usage, verbosity, playback controls, and stats outputs.
- Context: Phase 2 adds power features; they must be discoverable.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN README, WHEN user reads usage, THEN they can run trace, replay, and advanced stats without guessing.
- Technical notes:
  - Add “Simulation visibility” section:
    - trace creation
    - trace replay/view
    - verbosity
    - pause-on-war/speed
    - state hashing + verify
- Tasks:
  - [ ] Update README with commands and sample outputs.
  - [ ] Add example trace file (small) under `examples/` (optional).
  - [ ] Update any contributor notes for determinism/hashing expectations.

## Backlog / Future

### [F1-2] Advanced Rule Variants
- Status: Backlog
- Summary: Add optional variants like sudden-death ties, multiple decks, or alternate collect ordering.
- Context: Extends replayability and experimentation.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN variant flags, WHEN enabled, THEN engine applies alternate rules and reports them in output.
- Technical notes:
  - Maintain deterministic behavior across variants; document defaults vs overrides.
- Tasks:
  - [ ] Implement variants and update docs/tests.
  - [ ] Add CLI flags and validation.
