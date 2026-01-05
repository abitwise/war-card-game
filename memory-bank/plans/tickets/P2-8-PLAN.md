# Ticket Plan: P2-8 Support 2–4 Players

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Extend the engine, CLI, and renderers to support 2–4 players without changing the default two-player experience. Multi-player rounds must keep deterministic behavior: only tied-highest players continue wars, eliminations happen when a player has no cards at round start, and simulations/outputs remain reproducible.

## Requirements Alignment
- Based on ticket P2-8 in `memory-bank/plans/TICKETS.md`.
- CLI: `war play --players "A,B,C"` for named players (2–4), `war simulate --players 4` for player count; reject counts below 2 or above 4.
- Engine: remove two-player assumptions; deal and resolve rounds for N players (2–4). Wars involve only tied-highest players; elimination removes cardless players at round start; game ends when one remains.
- Rendering/trace: show all players, only war participants place war cards, keep event playerIds for traces/hashing.
- Simulation: track per-player wins for 3–4 players while preserving existing aggregates and determinism.
- Docs/tests: update README with `--players` usage and add coverage for 3- and 4-player scenarios (wars, elimination, deterministic runs).

## Plan / Tasks
1. Validate player counts (2–4) in CLI parsing and game creation helpers; default to two players when unspecified.
2. Refactor round resolution to iterate over active players, run wars among tied-highest participants only, and end games when one active player remains; ensure table/events stay deterministic for traces/hashes.
3. Update renderers (interactive + trace replay) to display multi-player flips/war stages and pile summaries for all players.
4. Wire player count/names through `play` and `simulate`; extend simulation metrics to handle multi-player win tracking without losing existing stats.
5. Refresh README and add tests covering 3–4 player runs, war subset behavior, and CLI validation; adjust plans/tickets after completion.

## Completion Notes
- Engine rounds now derive active players each round, limit war participation to tied-highest contenders, and tag events with participant order for rendering/traces.
- Simulation metrics generalize leader/swing tracking via spread across N players; both `play` and `simulate` enforce 2–4 player validation with defaults preserved.

## Testing Strategy
- Engine unit tests for multi-player war resolution, elimination, and deterministic outcomes.
- Renderer/CLI tests for `--players` parsing and multi-player output snapshots.
- Simulation tests ensuring per-player wins and aggregates remain deterministic for multi-player runs.
- Run `pnpm test` to exercise suites.

## Notes / Risks
- Changing event shapes for wars might require trace/renderer updates; keep backward-compatible data where possible.
- Ensure playerId ordering stays stable across rounds to maintain deterministic traces/hashes.
- Multi-player spread metrics should generalize previous two-player swing/lead calculations without inflating counts.
