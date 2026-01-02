# Ticket Plan: P1-6 Interactive Play CLI

- **Status:** Done  
- **Last Updated:** 2026-01-04  
- **Owner:** AI Assistant  

## Summary
Implement the `war play` interactive CLI mode so a human can battle a CPU with clear per-round feedback. Use `@inquirer/prompts` for controls, render engine events with readable formatting (`chalk`), and support autoplay/quit/stats shortcuts while keeping the engine pure and deterministic via seeded RNG.

## Requirements Alignment
- Based on ticket P1-6 in `memory-bank/plans/TICKETS.md` plus architecture/product briefs.  
- Provide a `war play` command that steps through rounds of War, showing flips, wars, and winners; default match is player vs CPU with standard rules.  
- Controls: Enter → play next round, `a` → toggle autoplay, `s` → show current stats/pile counts, `q` → quit, `?` → help.  
- Use engine events and RNG seeding for reproducibility; keep I/O confined to CLI/adapters.  
- Add smoke/snapshot-style tests to cover CLI output and prompt flow at least minimally.

## Plan / Tasks
1. Design an interactive loop that creates a seeded game, steps rounds via `playRound`, and streams events to a renderer; include autoplay handling and quit/timeout detection.  
2. Build a renderer under `src/adapters` (or CLI helpers) to format cards, wars, pile counts, and results using `chalk`, aligning with event types from the engine.  
3. Wire the `war play` commander command to initialize the game, invoke the interactive loop, and expose controls/help text.  
4. Add Vitest coverage (smoke/snapshot) for the interactive command/renderer to lock in output structure and control handling.  
5. Update tickets/plans to reflect progress and completion status once the ticket is done.

## Testing Strategy
- Prefer Vitest snapshots or logged-output assertions for the `play` command and renderer.  
- Run `pnpm test` for regression coverage; optionally run `pnpm lint` if time allows.

## Notes / Risks
- Keep autoplay bounded by `maxRounds` to avoid runaway loops; surface timeout reasons clearly.  
- Ensure renderer does not mutate game state; treat events as read-only inputs.  
- Prompt loops should remain responsive; avoid unnecessary async waits between rounds.

## Completion Notes
- Added an interactive play session loop wired to the engine with seeded game creation, manual steps, autoplay bursts, stats/help, and quit handling.  
- Implemented a chalk-based renderer for events, stats, and controls plus a commander `play` command that accepts seeds and optional autoplay start.  
- Added Vitest coverage for prompt handling, stats/help display, and autoplay batches to provide smoke coverage for the CLI flow.  
