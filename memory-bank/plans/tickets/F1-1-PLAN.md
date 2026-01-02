# Ticket Plan: F1-1 Enhanced TUI with Ink

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Deliver an optional Ink-based TUI for `war play` that renders the event stream live without prompt-based blocking. Keep the engine untouched while offering a richer view and ensuring autoplay compatibility.

## Requirements Alignment
- Based on ticket F1-1 in `memory-bank/plans/TICKETS.md` and architecture/product briefs.  
- Add a `--ui ink` option to `war play` while retaining the current prompt UX as default.  
- Implement an Ink renderer that consumes engine events, surfaces controls (Enter/a/s/q/?), and works with autoplay bursts.  
- Maintain determinism and avoid changing engine contracts or rules.

## Plan / Tasks
1. Add CLI flag/validation for selecting UI mode (`prompt` default, `ink` optional) and pass autoplay/seed into the chosen runner.  
2. Implement an Ink adapter that renders live rounds, stats, help, and supports the existing controls plus autoplay bursts without touching engine logic.  
3. Add Vitest coverage for UI selection and an Ink autoplay run (with injectable streams) to keep behavior deterministic.  
4. Update docs and ticket status notes once complete, ensuring new UI is discoverable.

## Testing Strategy
- Vitest suites for CLI option routing and Ink session autoplay completion.  
- Run `pnpm test`; run lint if time permits.

## Notes / Risks
- Update TypeScript config for TSX/React support and add Ink/React deps.  
- Ensure the Ink loop avoids blocking and exits cleanly when the game ends or the user quits.

## Completion Notes
- Added an Ink-based play experience behind `--ui ink`, including autoplay handling, stats/help panels, and controls parity with the prompt UI.  
- Introduced a headless/quiet Ink runner path for fast testing and wired a CLI UI selector with validation.  
- Updated README and tickets to reflect the new UI option and added Vitest coverage for command routing plus Ink autoplay.
