## Service Overview
- **Name:** War Card Game (CLI-focused)
- **Purpose:** Implement a CLI-based version of the War card game in TypeScript/Node.js with both interactive and simulation modes.

## Change Safety
- **Safe to change:** Documentation, plans in `memory-bank/`, and configuration scaffolding. These guide future implementation.
- **Risky to change:** Core game rules and deterministic behaviors (seeding, shuffle rules) once implemented. Avoid deviating from documented rules without updating plans and tests.

## Where to Look
- **Business rules:** `memory-bank/PRODUCT.md`, `memory-bank/ARCHITECTURE.md`, `memory-bank/LONG_TERM_MEMORY.md`.
- **API/contracts:** Future CLI commands and engine interfaces planned in `memory-bank/ARCHITECTURE.md`.
- **Tests:** None yet; future tests should live under `test/`.

## Agent Checklist (before PR)
1. Align changes with documented rules and architecture.
2. Keep plans in `memory-bank/` in sync with code changes.
3. Ensure deterministic behaviors remain documented (seeds, shuffle).
4. Add or update tests when modifying engine or CLI logic.
