# Ticket Plan: P2-4 Advanced Simulation Stats (Distributions + Extremes)

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Expand simulation reporting so analysts can understand run shape, outliers, and extreme battles—not just averages. The `war simulate` command should surface percentiles (p50/p90/p99) for rounds, war depth distributions, and highlight extremes such as the longest game, deepest war, and largest momentum swing. Provide optional histogram and markdown-friendly outputs without changing engine rules.

## Requirements Alignment
- Based on ticket P2-4 in `memory-bank/plans/TICKETS.md` and Phase 2 goals.  
- Add stats beyond averages: percentiles for rounds, war depth distribution, extremes (longest game, biggest war, biggest swing).  
- Track per-game metrics needed for aggregates: rounds, wars, max war depth, lead changes, recycles, and swing size (largest absolute change in card-count differential between consecutive rounds). Lead changes count when the leading player switches from one player to the other (ties do not increment the counter).  
- CLI enhancements: `--hist` to emit ASCII histograms for rounds and wars/game; `--md` to emit markdown-friendly tables in addition to existing text/JSON/CSV outputs.  
- Keep memory use reasonable (streaming-friendly); avoid storing unnecessary round-level data beyond what’s required for percentiles/extremes.  

## Plan / Tasks
1. Extend simulation run metrics collection to capture per-game details (rounds, wars, max war depth, recycle count from `PileRecycled`, lead changes via post-round card totals, biggest swing via per-round card differential deltas). Aggregate war depth occurrences across all games for distribution reporting.  
2. Compute percentiles (p50/p90/p99) and identify extremes (longest game by rounds, deepest war depth + which game, largest swing) while preserving existing averages and win/timeout/stalemate tracking.  
3. Update CLI output modes: enrich text summary with distributions/extremes, add ASCII histograms behind `--hist`, extend JSON/CSV payloads with new metrics, and support `--md` markdown tables.  
4. Add tests for deterministic stats on fixed seeds (including histogram flag behavior and CLI output shape), and update ticket/plan status after implementation with any notes.  

## Testing Strategy
- Unit tests for metric aggregation functions (percentiles, histograms, extremes) using deterministic seeds.  
- CLI command tests covering new flags (`--hist`, `--md`) and validating JSON/CSV schemas include new fields.  
- Run `pnpm test` to exercise the full suite.  

## Notes / Risks
- Keep engine untouched; all analytics live in simulation adapters/CLI.  
- Ensure trace sampling logic remains compatible with new metrics collection.  
- Large game counts may produce tall histograms; cap bin widths sensibly to keep output readable.  
