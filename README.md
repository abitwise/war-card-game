# War Card Game CLI

Deterministic, event-driven War card game with both interactive play and batch simulation modes. The CLI is installable via the `war` bin after building to `dist/`, and supports seeded runs for reproducibility.

## Quickstart

Prerequisites: Node 20+ ([install guides](https://nodejs.org/en/download/package-manager)), pnpm ([install docs](https://pnpm.io/installation)) or npm.

```bash
pnpm install          # Installs dependencies, builds to dist/ via prepare, and links the local war bin for pnpm exec
pnpm dev              # Start interactive play in dev mode (tsx)
# or use the compiled bin after build/prepare:
pnpm exec war play    # Interactive play (player vs CPU)
pnpm exec war simulate --games 10 --seed demo --json
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
war play [--seed <seed>] [--autoplay] [--ui <prompt|ink>]
```

- Default seed: `interactive` (use `--seed` to reproduce a game).
- Controls: `Enter` (next round), `a` (toggle autoplay bursts), `s` (stats), `q` (quit), `?` (help).
- Output shows per-round events, wars, pile recycling, and game end reasons (win/timeout/stalemate).

**UI modes (Ticket F1-1 – Enhanced TUI with Ink)**

- `--ui prompt` (default): step with prompts; best for learners who want to advance round-by-round.
- `--ui ink`: live-updating Ink TUI with the same controls and autoplay bursts, no prompts required. Ideal for watching games run while keeping stats visible.
- Example: `war play --ui ink --seed demo --autoplay` launches the Ink view with a reproducible game and autoplay engaged from the start.

**Play flow for new users**

1) Run the command above with your preferred `--ui` mode. 2) Press `Enter` to advance or `a` to let autoplay run bursts. 3) Press `s` anytime for stats or `?` to recap controls.

> Documentation specialist: please review this UI section to ensure it’s understandable for an average CLI user. Simplifications welcome.

### Simulations

```bash
war simulate [--games <count>] [--seed <seedBase>] [--json | --csv]
```

- Defaults: `--games 1`, `--seed base`.
- `--json` prints a structured summary; `--csv` prints a metric/value table. Use only one of these flags at a time.
- Reports wins per player, timeouts, stalemates, average rounds, and average wars. Per-game seeds derive from `<seedBase>-<index>`.

### Tracing (JSONL)

- Record interactive games: `war play --trace out/game.jsonl [--trace-snapshots] [--trace-top-cards]`.
- Record simulations: `war simulate --trace out/games.jsonl [--trace-mode single|sampled] [--trace-game-index 3 | --trace-sample-rate 0.05] [--trace-snapshots] [--trace-top-cards]`.
- Format: JSONL with a meta header followed by round-ordered records:
  - Meta: `{ type: "meta", version, engineVersion, timestamp, seed, rules, cliArgs, players, maxRounds }`
  - Events: `{ type: "event", round, event: <RoundEvent> }`
  - Snapshots (when enabled): `{ type: "snapshot", round, pileCounts, topCards? }`
- Traces stream directly to disk—no full in-memory history—making them safe for large simulation batches.

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

## Scripts

- `pnpm dev` – run interactive play via `tsx` (no build required).
- `pnpm simulate -- --games 100 --seed demo` – simulate without building.
- `pnpm build` – emit compiled assets and types to `dist/`.
- `pnpm test` – run Vitest suites.
- `pnpm lint` / `pnpm format` – lint/format checks.

## Project Notes

- Engine is pure/deterministic; rendering happens in adapters/CLI.
- `dist/` is excluded from version control but included in published artifacts via the `files` list.
