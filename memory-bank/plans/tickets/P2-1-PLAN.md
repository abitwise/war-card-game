# Ticket Plan: P2-1 Trace Schema + Streaming Writer (JSONL)

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Design and implement a JSONL trace format plus a streaming writer that records full game history without retaining all events in memory. Integrate trace emission into both interactive play and simulation flows so users can request trace files per run. Traces must begin with metadata (seed, rules, players, CLI args, etc.) followed by ordered event records, with optional per-round snapshots controlled by flags.

## Requirements Alignment
- Based on ticket P2-1 in `memory-bank/plans/TICKETS.md` and the Phase 2 plan.  
- Trace format: JSONL with a meta line containing version, engineVersion, timestamp, seed, rules, cliArgs, players, and maxRounds. Event lines wrap engine `RoundEvent` objects with the round number. Optional snapshot lines capture pile counts (and optionally top cards) behind flags.  
- CLI flags: `war play --trace <path>` and `war simulate --trace <path> --trace-mode single|sampled` with sampling controls via `--trace-sample-rate` or `--trace-game-index`. Tracing must not accumulate full trace data in memory—write incrementally.  
- Provide docs describing the trace format and usage.

## Plan / Tasks
1. Define trace schema types/constants (meta/event/snapshot records, version, engineVersion helper) to ensure stable JSONL structure.  
2. Implement a streaming `TraceWriter` that appends JSONL lines (meta + per-round events, optional snapshots/top-cards) without storing full traces; include helpers to derive round numbers and pile counts.  
3. Extend engine/CLI wiring so play and simulate commands accept trace flags, emit meta early, and stream events each round; support sampled tracing for simulations using deterministic selection.  
4. Add tests proving trace files include meta and ordered events for a fixed seed and validating CLI option handling where applicable.  
5. Update README (or docs) to document trace format, flags, and example usage.

## Testing Strategy
- Unit tests around trace writing and integration with deterministic seeds.  
- Commander option parsing tests for trace flags (errors and happy path).  
- Run `pnpm test`; add targeted suites under `test/trace` or `test/cli` mirroring new code paths.

## Notes / Risks
- Keep engine pure; tracing hooks must live in CLI/adapters and avoid altering deterministic game logic.  
- Ensure sampling is deterministic (seeded RNG) to keep reproducible runs.  
- Watch file path handling (create directories) and make sure traces flush/close cleanly to avoid corrupted files.  
- Top-card snapshot details stay opt-in behind the snapshot flag to keep trace payloads compact.  
