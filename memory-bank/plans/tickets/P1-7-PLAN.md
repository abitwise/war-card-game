# Ticket Plan: P1-7 Packaging and Docs

- **Status:** Done  
- **Last Updated:** 2026-01-02  
- **Owner:** AI Assistant  

## Summary
Polish the CLI so it is publishable/installable with a working bin entry and up-to-date documentation. Ensure the build outputs live in `dist/`, the bin target is wired to the compiled entrypoint, and the README explains installation, CLI commands (`play`, `simulate`), seeds, and default rules (including `maxRounds`).

## Requirements Alignment
- Ticket P1-7 from `memory-bank/plans/TICKETS.md`.  
- Keep architecture/product invariants: deterministic engine, default player-vs-CPU rules, `maxRounds` safeguard, and clear CLI wiring.  
- Deliverables: build artifacts configuration for the bin, README usage/options, documentation of defaults (`maxRounds`, war depth, collect/shuffle behavior).

## Plan / Tasks
1. Verify/update packaging metadata so `war` points at the compiled `dist/index.js` and builds run automatically for installs/packages.  
2. Update README with installation instructions, command examples for `war play` and `war simulate` (including `--json`/`--csv`), and document default rules (`maxRounds`, war face-down count, collect mode, shuffle behavior, ace high).  
3. Keep memory-bank tickets/plans in sync and mark the ticket done after implementation.

## Testing Strategy
- Run `pnpm build` to ensure the compiled bin exists and the build succeeds.  
- Run `pnpm test` for regression coverage if time permits.

## Notes / Risks
- Preserve deterministic defaults when describing behavior; do not change engine rules.  
- Ensure documentation reflects current commander options to avoid drift.

## Completion Notes
- Added a prepare build step and kept the bin targeting `dist/index.js` for install/link flows.  
- Documented installation, `war play` controls, `war simulate` options/outputs, seeding, and default rules (including `maxRounds` safeguards) in the README.  
- Marked ticket artifacts as complete per workflow.
