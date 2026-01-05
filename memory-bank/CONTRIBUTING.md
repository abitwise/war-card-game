# Contributing Guide

## Run the Service Locally
> The implementation is planned; commands below describe the intended workflow.
- Install dependencies: `pnpm install` (or `npm install`).
- Start interactive play (dev): `pnpm dev` → runs `tsx src/index.ts play`.
- Run a simulation: `pnpm simulate -- --games 1000 --seed base`.
- Build: `pnpm build` → compiles with `tsc`.

## Tests
- Unit tests (engine/CLI): `pnpm test` (vitest).
- Add seeds to tests for deterministic shuffles and round outcomes.

## Coding Style
- Language: TypeScript (ES2022/NodeNext).
- Lint/format: `eslint` + `prettier`; prefer strict typing and narrow types.
- Folder conventions:
  - Core logic in `src/engine`.
  - CLI wiring in `src/cli/commands`.
  - Rendering/adapters in `src/adapters`.
  - Tests mirror `src/` structure under `test/`.
- Avoid try/catch around imports; handle errors at call sites.

## Contribution Rules
- Prefer pure functions in the engine; keep I/O at the edge.
- Keep deterministic behaviors intact; changing RNG, shuffling, or ordering requires updating docs/tests.
- Trace/state hashing changes must stay deterministic: update documentation, sample traces, and replay verification expectations (`--state-hash` + `--verify`) together.
- Document new rule variants and surface them through CLI options.
- Keep controllers thin; heavy logic lives in the engine or reusable helpers.
- When adding features, update `memory-bank/` plans and tickets to stay in sync.

## Memory Bank Maintenance
- Follow `promps/memory-bank-updater-prompt.md` when recording recent changes so updates stay minimal and high-signal.
- Update freely: `memory-bank/plans/TICKETS.md`, `memory-bank/plans/PHASE-*.md`, and `memory-bank/plans/tickets/*` for progress or plan adjustments.
- Update carefully: `ARCHITECTURE.md` and `CONTRIBUTING.md` only when architecture or workflow meaningfully change; update `PRODUCT.md` rarely.
- Keep phase-specific details within phase plan files; avoid mixing stable, long-term notes with short-lived phase context.
