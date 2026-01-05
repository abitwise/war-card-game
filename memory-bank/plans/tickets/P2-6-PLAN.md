# Ticket Plan: P2-6 Deterministic State Hashing (Correctness + Regression)

- **Status:** Done  
- **Last Updated:** 2026-01-07  
- **Owner:** AI Assistant  

## Summary
Add canonical hashing of game state per round to validate determinism, support trace verification, and surface reproducible checkpoints. When enabled, the engine should emit a hash event every round using SHA-256 over a stable serialization of the current round and player piles. Hashing must support two modes: pile counts only or full pile contents, and integrate with CLI flags plus trace replay verification.

## Requirements Alignment
- Ticket P2-6 in `memory-bank/plans/TICKETS.md`.  
- Provide `hashState(state, mode)` (pure) with canonical ordering and SHA-256.  
- Emit a `StateHashed` event each round when hashing is enabled so renderers/traces can consume it.  
- CLI flag `--state-hash off|counts|full` for play/simulate; traces capture hashes; replay verification checks hashes.  
- Regression tests: fixed seed → expected hash sequence for first N rounds.  

## Plan / Tasks
1. Implement `StateHashMode` and `hashState(state, mode)` with canonical serialization (round + stable player pile order; counts vs full contents).  
2. Update `playRound` (and runners) to optionally emit `StateHashed` per round using provided mode; extend `RoundEvent` type.  
3. Plumb `--state-hash` through CLI (play/simulate) into game execution and trace metadata; render/hash events where appropriate.  
4. Extend trace replay verification to honor hashes based on trace meta; show hash lines in views for visibility.  
5. Add deterministic tests for hash outputs and replay verification with hashes enabled.  
6. Update ticket status/notes after implementation.  

## Testing Strategy
- Unit tests for `hashState` counts/full serialization using deterministic seeds.  
- Round-level test asserting emitted `StateHashed` events and expected hash strings for initial rounds.  
- Trace replay test verifying `--state-hash` traces pass verification.  
- Run `pnpm test` for regression coverage.  

## Notes / Risks
- Ensure serialization is stable across Node versions (avoid locale-dependent output).  
- Keep engine pure; no I/O in hashing.  
- Hash event ordering should not disrupt existing renderers; ensure new event is rendered or safely ignored where needed.  
- Trace metadata carries the configured state hash mode so replay verification can regenerate matching events.  
