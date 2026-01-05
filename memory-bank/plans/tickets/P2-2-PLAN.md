# Ticket Plan: P2-2 Trace View + Replay Commands

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Add CLI commands that consume previously generated trace files. Users should be able to inspect traces in a human-readable summary form and replay them to mirror live play output. Replay should optionally verify that regenerating the game with the trace metadata produces an identical event stream.

## Requirements Alignment
- Based on ticket P2-2 in `memory-bank/plans/TICKETS.md` and Phase 2 goals.  
- Provide a new `trace` command group with subcommands:  
  - `war trace view <file> [--from --to --only]` for readable summaries with optional filtering (wars, wins, recycles) and round ranges.  
  - `war trace replay <file> [--speed --pause-on-war --verbosity] [--verify]` to step through trace output, matching the live play renderer.  
- Replay must support a `--verify` mode that re-runs the engine from the trace metadata (seed + rules) and compares generated events to the trace, failing fast on mismatches.  
- Keep engine pure; parsing and rendering stay in CLI/adapters.  
- Add tests proving replay/verify works for a fixed trace.

## Plan / Tasks
1. Implement trace file reader/parser for JSONL records (meta, event, snapshot) with validation and helpful errors. ✅  
2. Add commander `trace` group with `view` and `replay` subcommands, wiring shared options (round range, filters, speed/pause placeholders, verify flag). ✅  
3. Build view renderer that walks records to summarize rounds, wars, endings, and optionally filter displayed events. ✅  
4. Implement replay renderer that iterates events in order, printing via existing interactive renderer helpers to mirror live output; respect basic speed/pause controls as placeholders if needed. ✅  
5. Add verification path: rebuild game from meta seed/rules, replay events alongside engine output, and fail on divergence. ✅  
6. Add tests with a deterministic trace file to cover view output structure and verify mode success. ✅  
7. Update ticket status fields once complete and align docs if new usage needs mentioning. ✅

## Testing Strategy
- Unit tests for trace parsing and filtering.  
- Integration-style test generating a deterministic trace, then running replay with verify to ensure event parity.  
- Execute `pnpm test` to cover suites.

## Notes / Risks
- Large traces should stream/iterate rather than load entirely; watch memory usage.  
- Verification must consider round numbers to avoid off-by-one mismatches.  
- Keep output concise in view mode to avoid overwhelming users with per-event noise.  
- Implemented default replay rendering directly from trace records, with optional verification that regenerates events from the meta seed/rules for parity checks.
