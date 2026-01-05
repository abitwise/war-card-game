# Ticket Plan: P2-5 Playback Controls (Speed Toggle + Pause-on-War)

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Enhance playback controls for watching games by adding speed control and pause-on-war behavior across interactive play, trace replay, and the Ink UI. Users should be able to slow down or speed up autoplay/replay and have the system pause automatically when a war starts.

## Requirements Alignment
- Ticket P2-5 from `memory-bank/plans/TICKETS.md` and Phase 2 goals.  
- Apply playback controls to `war play` (prompt-based), `war trace replay`, and the optional Ink UI.  
- Speed model: accept a speed multiplier and an explicit delay value. Higher speed values should reduce wait time between bursts/rounds; delay can be set directly.  
- Pause-on-war: detect war events from the event stream and pause autoplay/replay until the user continues.

## Plan / Tasks
1. Add CLI flags for `war play` and `war trace replay` to control speed (`--speed`) and delay (`--delay-ms`), plus `--pause-on-war` toggles.  
2. Update interactive play loop (prompt UI) to honor the effective delay, with optional automatic pause when a war occurs.  
3. Extend Ink UI autoplay scheduling to use the same delay/speed model and pause when wars are detected.  
4. Adjust trace replay timing to use multiplier/delay inputs and pause on wars via the event stream.  
5. Add unit coverage for pause-on-war behavior using simulated events/traces; keep tests deterministic with fixed seeds.  
6. Update ticket/plan status after implementation; ensure CLI docs/help reflect new flags if touched.

## Testing Strategy
- Unit tests for interactive play autoplay/pause handling (fixed seed that guarantees a war).  
- Trace replay test exercising pause-on-war hook without waiting for real input.  
- CLI command parsing tests covering new flags and validation.  
- Run `pnpm test` for regression coverage.

## Notes / Risks
- Avoid slowing down default flows excessively; keep effective delay reasonable or configurable for tests.  
- Preserve engine purity; all timing/pause behavior should live in CLI/adapters.  
- Ensure deterministic seeds in tests to make war detection predictable.
