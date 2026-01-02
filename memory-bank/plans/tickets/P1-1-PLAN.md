# Ticket Plan: P1-1 Project Tooling and Scaffolding

- **Status:** Done  
- **Last Updated:** 2026-01-02  
- **Owner:** AI Assistant  

## Summary
Set up the initial TypeScript/Node CLI scaffold for the War card game so future tickets can build on consistent tooling. Provide package management, build/test scripts, lint/format config, and starter source layout in line with the documented architecture.

## Requirements Alignment
- Follow `memory-bank/PRODUCT.md` and `memory-bank/ARCHITECTURE.md` for CLI-first NodeNext setup.  
- Implement ticket tasks from `memory-bank/plans/TICKETS.md` for P1-1 (package.json with scripts/bin, tsconfig + lint/format config, basic `src/` and `test/` scaffolding).  
- Keep deterministic foundations ready for future engine work; no game logic implemented here.  

## Plan / Tasks
1. Create `package.json` with bin entry, `dev/build/test/simulate` scripts, and required deps (`tsx`, `typescript`, `commander`, `@inquirer/prompts`, `chalk`, `seedrandom`, `vitest`, `eslint`, `prettier`).  
2. Add `pnpm-lock.yaml` by installing dependencies with pnpm.  
3. Configure TypeScript (`tsconfig.json`, optional test config) for ES2022/NodeNext and `dist` output.  
4. Configure lint/format (`.eslintrc.cjs`, `.eslintignore`, `.prettierrc`, `.prettierignore`) following CONTRIBUTING style.  
5. Scaffold directories under `src/` (`engine`, `cli/commands`, `cli/format`, `adapters`) and `test/`; add entrypoint stub (`src/index.ts`) with placeholder commands.  
6. Add minimal test placeholder so `pnpm test` succeeds.  

## Testing Strategy
- Run `pnpm test` (vitest) to confirm the harness executes.  
- Optionally run `pnpm lint` once lint script exists to verify config.  

## Notes / Risks
- Keep stub commands minimal to avoid locking in APIs before later tickets.  
- Ensure NodeNext module settings so future CLI bin works after build.  

## Completion Notes
- Dependency installation and lockfile generation are blocked by registry 403 responses in this environment; dependencies are declared in `package.json` and should be installed with pnpm once registry access is available.  
- Tests and lint were not executed here because dependencies could not be installed.  
