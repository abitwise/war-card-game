# Long-Term Memory

## Core Invariants
- Engine must remain pure and deterministic when provided a seed; no hidden randomness in rendering layers.
- Default rules: Ace high, one face-down card in war, collect to won pile then recycle (shuffling allowed), player-vs-CPU default mode.
- Round step resolves a full battle (including nested wars) before returning control to the caller.
- `maxRounds` safeguard required for simulations/autoplay to prevent infinite loops; timeouts should be reported, not silently ignored.

## Design Decisions to Preserve
- **Events-first architecture**: UIs (prompts, logging, future TUI) consume engine events; avoid coupling UIs to internal state structures.
- **Injectable RNG**: Use seedable RNG to reproduce games; critical for debugging and regression testing.
- **Configurable house rules**: Keep variants documented and behind flags; default behavior should remain classic War.
- **Recycling behavior**: Recycle won pile into draw pile when empty; shuffle configurable, deterministic when seeded.

## Known Risks / Tradeoffs
- War can produce very long games; `maxRounds` and timeout reporting are essential for user trust.
- Interactive prompt loops can become sluggish for long autoplay; consider batching events or lightweight renders if performance degrades.
- Multiple rule variants increase test surface; ensure coverage per variant to avoid regressions.

## Future Agent Notes
- When adding new UI layers (e.g., Ink), do not bypass the engine event stream; add adapters instead.
- If changing war resolution edge cases (insufficient cards), update documentation, tests, and CLI help together.
- Keep README and CLI `--help` aligned with documented defaults and available variants.
