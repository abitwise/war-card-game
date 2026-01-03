# Phase 2 Plan — Visibility, Traces, and Simulation Analytics

## Goals
- Produce a **full game history artifact** (“trace”) for any run (simulate or play) that can be inspected and replayed.
- Improve **card/round visibility** so outcomes feel understandable without drowning in noise.
- Upgrade simulation reporting with **explanatory statistics** (distributions, percentiles, extremes) beyond averages.
- Add **playback UX controls** focused on simulation watching: speed toggle + pause-on-war.
- Add **deterministic state hashing** for correctness, replay validation, and regression testing.

## Non-Goals
- Adding new game rule variants (handled in future rules-focused phases).
- Networked multiplayer, GUI, or web UI.
- Heavy “full-state snapshot every round” by default (keep trace compact; snapshots optional).

## Ticket Sequence & Priorities
1. **P2-1** Trace schema + writer (JSONL) — unlocks visibility and replay workflows.
2. **P2-2** Trace viewer + replay command — converts trace into practical “watchability”.
3. **P2-3** Renderer verbosity + battle/war visualization — “see enough to feel the battle”.
4. **P2-4** Advanced simulation stats (distributions + extremes) — explain run behavior.
5. **P2-5** Playback controls (speed toggle + pause-on-war) — interactive + optional TUI.
6. **P2-6** Deterministic state hashing — correctness guardrails + regression tests.
7. **P2-7** Docs + examples — make all of this discoverable and standardized.

## Design Notes / Constraints
- Preserve the architecture invariant: **pure engine, I/O adapters at the edge**.
- Trace generation must be deterministic and stable:
  - Always record metadata: rules, seed, engine version, and any flags used.
  - Prefer recording the **event stream**; optionally record initial deck order for “replay even if shuffle code changes”.
- Avoid memory blowups in big simulations:
  - Streaming trace writer (append JSONL), no giant in-memory arrays.
  - Sampling options (e.g., only trace game #k, or 1/N games).
- Keep UX simple:
  - `--verbosity low|normal|high`
  - `--pause-on-war`
  - `--speed 1|5|25|max` (or ms delay)
