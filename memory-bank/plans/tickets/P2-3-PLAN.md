# Ticket Plan: P2-3 Renderer Verbosity + “Feel the Battle” Visibility

- **Status:** Done  
- **Last Updated:** 2026-01-06  
- **Owner:** AI Assistant  

## Summary
Improve round rendering so players can “feel” how each battle unfolds. Add configurable verbosity levels to the `play` command (and trace replay) that trade detail for brevity, plus clearer war visualization that shows face-down packages and face-up flips with a consistent layout. High verbosity should surface full card ordering (face-down shown as 🂠), while low verbosity focuses on winners and pile counts.

## Requirements Alignment
- Based on ticket P2-3 in `memory-bank/plans/TICKETS.md` and the Phase 2 plan.  
- Add a `--verbosity low|normal|high` flag to `war play` and ensure `trace replay` respects the same levels.  
- Rendering behavior:  
  - **Low:** concise winner + pile counts per round.  
  - **Normal:** show flips and war structure with face-down placeholders.  
  - **High:** show full played-card ordering (face-down as 🂠).  
- Introduce consistent war visualization (flip, WAR marker, down/up lines) without changing engine behavior.  
- Provide snapshot/smoke tests covering representative outputs.

## Plan / Tasks
1. Add shared verbosity-aware round formatting helpers (cards, wars, pile summaries) that can drive both interactive play and trace replay outputs.  
2. Wire `--verbosity` into `war play` (prompt/trace pathways) and ensure trace replay uses the same rendering logic.  
3. Update renderers to display face-down cards as 🂠 and add war ladder-style output for normal/high modes.  
4. Add tests (snapshots/smoke) for low/normal/high outputs on a deterministic war round; adjust CLI command tests for new flag plumbing.  
5. Update ticket status/notes once implementation completes and document any deviations.

## Testing Strategy
- Unit/snapshot tests for the verbosity renderer to lock expected output across verbosity modes.  
- CLI command tests ensuring `--verbosity` parses and flows to play/replay handlers.  
- Run `pnpm test` to exercise suites.

## Notes / Risks
- Must not modify engine logic; all changes live in renderers/adapters.  
- War visualization relies on `CardsPlaced` ordering—handle edge cases where players lack enough cards without crashing.  
- Keep output succinct in low verbosity while still communicating pile counts.  
- Implemented shared renderer output for play and trace replay so verbosity behaves consistently across modes.
