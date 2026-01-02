# Phase 1 Plan

## Goals
- Stand up the CLI project skeleton with deterministic foundations.
- Implement the War engine with configurable rules and event output.
- Deliver simulation and interactive play commands with clear defaults (player vs CPU).
- Provide documentation and packaging for repeatable usage.

## Ticket Sequence & Priorities
1. **P1-1** Project Tooling and Scaffolding — unblock all development.
2. **P1-2** Deck and RNG Foundations — core data + determinism.
3. **P1-3** Game State and Rules Model — establish contracts for engine/CLI.
4. **P1-4** Round Resolution Engine — main gameplay logic.
5. **P1-5** Simulation CLI Command — fast feedback and analytics.
6. **P1-6** Interactive Play CLI — primary UX, default player-vs-CPU.
7. **P1-7** Packaging and Docs — polish and publish-ready state.

## Notes
- Default interactive UX should prioritize `@inquirer/prompts` for speed of delivery; consider `ink` as a follow-up (F1-1).
- Maintain deterministic behavior throughout; seeds should reproduce shuffles and outcomes.
- Apply a sensible `maxRounds` to avoid infinite simulations and surface timeouts in stats.
