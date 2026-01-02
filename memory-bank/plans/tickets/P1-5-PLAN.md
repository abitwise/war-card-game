# Ticket Plan: P1-5 Simulation CLI Command

- **Status:** Done  
- **Last Updated:** 2026-01-03  
- **Owner:** AI Assistant  

## Summary
Implement the `war simulate` CLI command that runs multiple deterministic War games and reports aggregate statistics. Wire the CLI to the pure engine so simulations can replay via seeds, surface win/timeout outcomes, and output results in human-readable and machine-friendly formats (JSON/CSV) without embedding I/O into the engine core.

## Requirements Alignment
- Based on ticket P1-5 in `memory-bank/plans/TICKETS.md` plus architecture/product briefs.  
- Provide a CLI command `war simulate --games N` that runs N games using deterministic seeds and reports win counts, average rounds, wars per game, and timeouts.  
- Support seed base pattern (`seed + index`) for reproducibility across game batches.  
- Offer JSON/CSV output options in addition to default console-friendly formatting.  
- Leverage engine `run` helper to execute full games; keep engine pure and deterministic.

## Plan / Tasks
1. Add engine-level game runner that builds a shuffled deck from a seed, creates the game state, loops `playRound` until completion/timeout, and returns final state plus emitted events for rendering/analysis.  
2. Implement CLI `simulate` command with options for game count, seed base, and JSON/CSV output; validate inputs and map seeds using base + index pattern.  
3. Produce aggregate metrics (wins per player, average rounds, wars per game, timeout count, stalemates) and render them in table-like text plus JSON/CSV serialization.  
4. Add Vitest coverage for the runner determinism and CLI option/output behavior, including seed sequencing and format switches.  
5. Update tickets/plans to reflect progress and completion status.

## Testing Strategy
- Run `pnpm test` for unit coverage.  
- Add focused tests under `test/cli` (or similar) for command parsing/output and under `test/engine` for the game runner determinism.  
- Optionally run `pnpm lint` if time allows.

## Notes / Risks
- Ensure a single seeded RNG drives both deck shuffle and in-game recycling shuffles for reproducibility.  
- Keep engine pure—no console I/O inside the runner; CLI handles presentation.  
- Handle edge endings (timeouts/stalemates) clearly in aggregates to avoid misleading win counts.  

## Completion Notes
- Added a pure game runner that seeds deck shuffles and round recycling with a shared RNG, looping `playRound` until completion.  
- Implemented `war simulate` with game-count parsing, seed base sequencing, and JSON/CSV/text outputs covering wins, rounds, wars, and timeouts/stalemates.  
- Added deterministic simulation and CLI coverage to lock in seed handling, format options, and invalid argument handling.  
