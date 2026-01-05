# Ticket Plan: P2-7 Docs & Examples Update

- **Status:** Done  
- **Last Updated:** 2026-01-05  
- **Owner:** AI Assistant  

## Summary
Document the Phase 2 visibility features so users can record, inspect, and replay games without guessing flags. Surface trace creation, trace view/replay, verbosity modes, playback controls, advanced simulation stats, and state hashing/verification in the README. Provide a small example trace file and make sure contributor guidance calls out determinism and hashing expectations.

## Requirements Alignment
- Ticket P2-7 in `memory-bank/plans/TICKETS.md`.  
- Phase 2 goal: visibility + observability for simulations and replays.  
- Highlight: trace creation/consumption, verbosity, pause-on-war/speed controls, state hashing + verify.  

## Plan / Tasks
1. Expand README with a dedicated visibility/observability section covering trace commands, replay options, verbosity, playback controls, advanced simulation stats, and state hashing usage. Include sample commands + outputs.  
2. Add an example JSONL trace under `examples/` generated from a deterministic seed to illustrate the schema.  
3. Update contributor guidance to remind maintainers about deterministic hashing/trace expectations.  
4. Mark ticket artifacts as Done once documentation and examples are in place.  

## Testing Strategy
- No runtime logic changes; spot-check README examples against current CLI flags.  
- Manually generate the example trace via the simulate command to keep the schema accurate.  

## Notes / Risks
- Keep trace examples small enough for readers while still complete (include meta + events + hashes).  
- Ensure docs stay aligned with existing flags; avoid inventing new options or behaviors.  
