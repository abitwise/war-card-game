# Tickets

## Phase 1 (Current)

### [P1-1] Project Tooling and Scaffolding
- Status: Backlog
- Summary: Initialize TypeScript Node CLI project with baseline tooling and scripts.
- Context: Needed to run dev commands, build, and test the future engine/CLI.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN an empty repo, WHEN dependencies are installed, THEN scripts `dev`, `build`, `test`, and `simulate` are available.
- Technical notes:
  - Use `pnpm` (or npm) with `tsx`, `typescript`, `commander`, `@inquirer/prompts`, `chalk`, `seedrandom`, `vitest`, `eslint`, `prettier`.
  - Configure `tsconfig` for NodeNext/ES2022; add `bin` entry for CLI.
- Tasks:
  - [ ] Add `package.json` with scripts and bin entry.
  - [ ] Configure `tsconfig.json`, `eslint`, `prettier`.
  - [ ] Add basic folder scaffold under `src/` and `test/`.

### [P1-2] Deck and RNG Foundations
- Status: Backlog
- Summary: Implement cards, deck generation, and deterministic shuffling.
- Context: Core building block for engine and simulations.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN a seed, WHEN a deck is generated and shuffled, THEN results are deterministic and contain 52 unique cards per deck.
- Technical notes:
  - Card ranks 2..14 (Ace high), four suits.
  - Use `seedrandom` or injectable RNG interface.
- Tasks:
  - [ ] Implement `Card`, `Deck` helpers with deterministic shuffle.
  - [ ] Add tests for uniqueness and deterministic ordering.

### [P1-3] Game State and Rules Model
- Status: Backlog
- Summary: Define War rules/config, game state shape, and defaults.
- Context: Needed for engine consistency and CLI option mapping.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN default rules, WHEN a game is created, THEN config matches documented defaults (Ace high, war down count 1, collect to won pile, shuffle on recycle, maxRounds safeguard).
- Technical notes:
  - Include tieResolution option (`standard-war` vs `sudden-death`), collect mode, max rounds.
- Tasks:
  - [ ] Implement `WarRules`, `GameState`, `PlayerState`, `TableState`.
  - [ ] Provide defaults and validation (zod optional).

### [P1-4] Round Resolution Engine
- Status: Backlog
- Summary: Implement `playRound/step` resolving a full battle including wars.
- Context: Core gameplay for both interactive and simulation flows.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN two players with cards, WHEN a round is played, THEN the highest card wins; ties trigger war with configured face-down count; inability to continue war results in loss per documented rule.
- Technical notes:
  - Support recycling won pile when draw pile empty (optional shuffle).
  - Decide and document behavior when player lacks enough cards during war (use “place what you can; if no face-up, you lose”).
- Tasks:
  - [ ] Implement round resolution returning new state plus events.
  - [ ] Handle elimination and winner detection.
  - [ ] Add tests for wars, recycling, and edge cases.

### [P1-5] Simulation CLI Command
- Status: Backlog
- Summary: Add `war simulate` command to run N games and report aggregates.
- Context: Enables analytics and regression checks.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `--games N`, WHEN command runs, THEN it outputs win counts, average rounds, wars per game, and timeouts; supports `--json`/`--csv`.
- Technical notes:
  - Use `commander`; leverage engine `run` function; support seed base pattern (seed + index).
- Tasks:
  - [ ] Implement command wiring and output formatting.
  - [ ] Add tests for argument parsing and deterministic results.

### [P1-6] Interactive Play CLI
- Status: Backlog
- Summary: Add `war play` interactive mode with default player-vs-CPU and `@inquirer/prompts`.
- Context: Primary user-facing experience.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN the CLI, WHEN user runs `war play`, THEN they can advance rounds, view pile counts, handle wars visibly, and quit or autoplay.
- Technical notes:
  - Controls: Enter (next), a (autoplay), s (stats), q (quit), ? (help).
  - Render events clearly; consider `chalk` for emphasis.
- Tasks:
  - [ ] Wire prompts to engine steps.
  - [ ] Add renderer for per-round output.
  - [ ] Add smoke tests or snapshot coverage for CLI output.

### [P1-7] Packaging and Docs
- Status: Backlog
- Summary: Final polish for installable CLI and documentation.
- Context: Ensures usability and discoverability.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN repository build, WHEN published/installed, THEN CLI is runnable via bin entry; README documents usage and examples.
- Technical notes:
  - Update README with examples; ensure build output in `dist/`.
- Tasks:
  - [ ] Configure build artifacts and bin target.
  - [ ] Document CLI usage and options.
  - [ ] Verify `maxRounds` and default rules are documented.

## Backlog / Future

### [F1-1] Enhanced TUI with Ink
- Status: Backlog
- Summary: Optional richer TUI experience using `ink`.
- Context: Provide a more dynamic interface once core CLI is solid.
- Functional behavior (GIVEN/WHEN/THEN):
  - GIVEN `war play --ui ink`, WHEN invoked, THEN users see a live-updating interface without prompts.
- Technical notes:
  - Leverage existing event stream; keep engine untouched.
- Tasks:
  - [ ] Add flag and renderer; ensure compatibility with autoplay.

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
