# War Card Game CLI

Deterministic, event-driven War card game with both interactive play and batch simulation modes. The CLI is installable via the `war` bin after building to `dist/`, and supports seeded runs for reproducibility.

## Quickstart

Prerequisites: Node 20+ ([install guides](https://nodejs.org/en/download/package-manager)), pnpm ([install docs](https://pnpm.io/installation)) or npm.

```bash
pnpm install          # Installs dependencies, builds to dist/ via prepare, and links the local war bin for pnpm exec
pnpm dev              # Start interactive play in dev mode (tsx)
# or use the compiled bin after build/prepare (adds trace, replay, and stats tooling):
pnpm exec war play
pnpm exec war simulate --games 10 --seed demo --json
pnpm exec war trace view examples/trace-sample.jsonl
```

Using npm instead of pnpm:

```bash
npm install
npm run dev
npm exec war play
npm exec war simulate -- --games 10 --seed demo --json
```

Running the published CLI via `npx`:

```bash
npx war play
npx war simulate --games 10 --seed demo --json
```

`pnpm build` compiles TypeScript to `dist/`. The `war` bin points to `dist/index.js`, so ensure the build has run (prepare handles this on install/link/publish).

## CLI Commands

### Interactive Play

```bash
war play [--seed <seed>] [--autoplay] [--ui <prompt|ink>] [--speed <multiplier>] [--delay-ms <ms>] [--pause-on-war]
```

- Default seed: `interactive` (use `--seed` to reproduce a game).
- Controls: `Enter` (next round), `a` (toggle autoplay bursts), `s` (stats), `q` (quit), `?` (help).
- Output shows per-round events, wars, pile recycling, state hashes (when enabled), and game end reasons (win/timeout/stalemate).
- Playback controls (also used by trace replay): `--speed` scales the delay between autoplay bursts (higher = faster), `--delay-ms` sets the base delay, and `--pause-on-war` pauses autoplay when a war starts.
- Verbosity: `--verbosity low|normal|high`
  - `low` → short winner + pile summaries per round.
  - `normal` → war ladder with face-down placeholders plus trick results.
  - `high` → `normal` + full played-card ordering per player (face-down shown as 🂠).

**UI modes (Ticket F1-1 – Enhanced TUI with Ink)**

- `--ui ink` (default): live-updating Ink TUI with the same controls and autoplay bursts, no prompts required. Ideal for watching games run while keeping stats visible.
- `--ui prompt`: step with prompts; best for learners who want to advance round-by-round.
- Example: `war play --ui ink --seed demo --autoplay` launches the Ink view with a reproducible game and autoplay engaged from the start.

**Play flow for new users**

1) Run the command above with your preferred `--ui` mode. 2) Press `Enter` to advance or `a` to let autoplay run bursts. 3) Press `s` anytime for stats or `?` to recap controls.

> Documentation specialist: please review this UI section to ensure it’s understandable for an average CLI user. Simplifications welcome.

### Simulations

```bash
war simulate [--games <count>] [--seed <seedBase>] [--json | --csv | --md] [--hist] [--trace ...]
```

- Defaults: `--games 1`, `--seed base`.
- Reporting formats:
  - `--json` → structured summary (percentiles, war depth distribution, interesting moments, histograms, per-game runs).
  - `--csv` → metric/value table (wins, stats, histograms, interesting moments).
  - `--md` → Markdown table + “Interesting Moments” section (optionally includes histograms when combined with `--hist`).
- Text output (default) includes per-game averages, round percentiles (p50/p90/p99), war depth distribution, lead changes/recycles, “Interesting moments” (top 3 longest games, deepest wars, biggest swings), and optional ASCII histograms with `--hist`.
- Per-game seeds derive from `<seedBase>-<index>`; stats stay deterministic for a given seed base.
- Trace flags mirror `war play` (see “Simulation visibility” below) so batches can emit JSONL traces without loading full histories into memory.
- Example (text + histograms):

```
pnpm exec war simulate --games 1 --seed docs --hist
Simulated 1 game(s) with seed base "docs".

Wins:
- Player 1: 0
- Player 2: 1
- Timeouts: 0
- Stalemates: 0

Averages per game:
- Rounds: 199.00
- Wars: 12.00
- Recycles: 19.00
- Lead changes: 5.00

Rounds percentiles (p50/p90/p99): 199.00 / 199.00 / 199.00
War depth distribution: depth 1: 12

Interesting moments:
  - Longest games:
    1. Game #1 (docs-1): 199 rounds (win, winner Player 2)
  - Deepest wars:
    1. Game #1 (docs-1) round 12: depth 1
    2. Game #1 (docs-1) round 56: depth 1
    3. Game #1 (docs-1) round 72: depth 1
  - Biggest swings:
    1. Game #1 (docs-1) round 12: swing 6 cards
Rounds per game:
199        | ############################## (1)

Wars per game:
12         | ############################## (1)
```

### Simulation visibility (traces, replay, verbosity, hashing)

**Record traces (JSONL, streaming)**

- `war play --trace out/game.jsonl [--trace-snapshots] [--trace-top-cards] [--state-hash <mode>]`
- `war simulate --trace out/games.jsonl [--trace-mode single|sampled] [--trace-game-index 3 | --trace-sample-rate 0.05] [--trace-snapshots] [--trace-top-cards] [--state-hash <mode>]`
- Format: JSONL with one record per line:
  - Meta: `{ type: "meta", version, engineVersion, timestamp, seed, rules, cliArgs, players, maxRounds, stateHashMode }`
  - Events: `{ type: "event", round, event: <RoundEvent> }` (includes `StateHashed` when enabled)
  - Snapshots (optional): `{ type: "snapshot", round, pileCounts, topCards? }`
- Trace modes:
  - `single` (default): one meta + ordered events in a single file (play or a chosen simulation game).
  - `sampled`: each sampled game writes to its own file, appending `-game<index>` to the base path.
- Uses streaming writes (no in-memory accumulation) so large simulations stay safe.

**View traces**

- `war trace view <file> [--from 10 --to 25] [--only wars|wins|recycles]`
- Prints seed, players, round count, wars/recycles, ending, then a round-by-round recap filtered to the requested slice.
- Example using the bundled sample trace:

```
pnpm exec war trace view examples/trace-sample.jsonl --from 1 --to 3
Trace: examples/trace-sample.jsonl
Seed: docs-1
Players: Player 1 vs Player 2
Rounds recorded: 199 | Wars: 12 | Recycles: 19
Ending: Player 2 won

Showing rounds 1 to 3

Round 1
Player 1 played: 7♠
Player 2 played: 5♥
Player 1 wins the trick and collects 2 card(s).
State hash (counts) [round 1]: 57ec02600e8268ec691d98e80ce31e965441aae9d24e7b1c8401bcc4cedb4a4b
```

**Replay traces**

- `war trace replay <file> [--from <round>] [--to <round>] [--verbosity low|normal|high] [--speed <multiplier>] [--delay-ms <ms>] [--pause-on-war] [--verify]`
- Respects the same verbosity ladder as live play. `--pause-on-war`, `--speed`, and `--delay-ms` control playback pacing.
- `--verify` replays the game using the trace metadata (seed, rules, player names, and state hash mode) and fails fast if any event diverges.

**State hashing + verification**

- Hash modes: `--state-hash off|counts|full` (supported in `war play`, `war simulate`, and carried into traces).
- `counts` hashes round number + pile counts per player; `full` hashes round number + exact pile contents. Hash events surface in output and trace records as `StateHashed`.
- `war trace replay --verify` regenerates hashes using the meta’s `stateHashMode` so verification includes hash parity.

**Verbosity quick reference**

- `--verbosity low`: minimal per-round output (winners + pile summaries).
- `--verbosity normal`: standard war ladder (face-down shown as 🂠), pile recycles, trick results.
- `--verbosity high`: `normal` + full table ordering per player for the round.

## Determinism & Seeding

- Decks are shuffled with a seeded RNG; the same seed yields the same game.
- Simulations derive seeds from the base seed plus the game index.
- Default match-up is Player 1 vs Player 2 (CPU) using the rules below.

## Default Rules

- Decks: 1 standard deck (52 cards), Ace high.
- War depth: 1 face-down card before the face-up battle card.
- Collect mode: cards go to the winner’s won pile, then recycle.
- Recycling: won pile recycled into draw pile, shuffled on recycle.
- Tie resolution: `standard-war` (wars can nest); optional `sudden-death` via rules in engine/CLI.
- `maxRounds`: 10,000 (game ends with a timeout event if exceeded).

## Examples

- `examples/trace-sample.jsonl` — Generated via `war simulate --games 1 --seed docs --trace examples/trace-sample.jsonl --trace-game-index 1 --state-hash counts`. Contains meta + events + state hashes for a 199-round game. Use it with `war trace view` or `war trace replay --verify` to explore the trace format.

## Scripts

- `pnpm dev` – run interactive play via `tsx` (no build required).
- `pnpm simulate -- --games 100 --seed demo` – simulate without building.
- `pnpm build` – emit compiled assets and types to `dist/`.
- `pnpm test` – run Vitest suites.
- `pnpm lint` / `pnpm format` – lint/format checks.

## Project Notes

- Engine is pure/deterministic; rendering happens in adapters/CLI.
- `dist/` is excluded from version control but included in published artifacts via the `files` list.
