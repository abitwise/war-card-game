# War Card Game CLI

Deterministic, event-driven War card game with both interactive play and batch simulation modes. The CLI is installable via the `war` bin after building to `dist/`, and supports seeded runs for reproducibility.

## Quickstart

Prerequisites: Node 20+, pnpm (or npm).

```bash
pnpm install          # Installs dependencies and builds to dist/ via prepare
pnpm dev              # Start interactive play in dev mode (tsx)
# or use the compiled bin after build/prepare:
pnpm exec war play    # Interactive play (player vs CPU)
pnpm exec war simulate --games 10 --seed demo --json
```

`pnpm build` compiles TypeScript to `dist/`. The `war` bin points to `dist/index.js`, so ensure the build has run (prepare handles this on install/link/publish).

## CLI Commands

### Interactive Play

```bash
war play [--seed <seed>] [--autoplay] [--ui <prompt|ink>]
```

- Default seed: `interactive` (use `--seed` to reproduce a game).
- Controls: `Enter` (next round), `a` (toggle autoplay bursts), `s` (stats), `q` (quit), `?` (help).
- `--ui prompt` uses the existing prompt-based flow (default). `--ui ink` enables a live Ink TUI that updates stats/events without prompts while honoring the same controls and autoplay bursts.
- Output shows per-round events, wars, pile recycling, and game end reasons (win/timeout/stalemate).

### Simulations

```bash
war simulate [--games <count>] [--seed <seedBase>] [--json | --csv]
```

- Defaults: `--games 1`, `--seed base`.
- `--json` prints a structured summary; `--csv` prints a metric/value table. Use only one of these flags at a time.
- Reports wins per player, timeouts, stalemates, average rounds, and average wars. Per-game seeds derive from `<seedBase>-<index>`.

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
