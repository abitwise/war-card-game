As a senior software engineer, please create agent memory-bank and split the info about the design and rules, architecture etc into separate files. for each file create text box in markdown format. Don't write any code yet, create only memory bank with plan to build the game.

Here is the structure of the memory bank:

/{{SERVICE_NAME}}
├── AGENTS.md
└── memory-bank/
    ├── PRODUCT.md
    ├── ARCHITECTURE.md
    ├── CONTRIBUTING.md
    ├── plans/TICKETS.md
    ├── plans/{{PHASE_NAME}}-PLAN.md    (optional)
    └── LONG_TERM_MEMORY.md             (optional, if non-trivial)

This memory bank is optimized for:
- Fast loading by agents
- High signal, low noise
- Staying in sync with the code.

1. **AGENTS.md**
   - Briefly describe:
     - What this service does
     - What the agent is allowed to change and what is risky
     - Where to look first (files/folders) for:
       - Business rules
       - API contracts
       - Tests
     - A small “Agent checklist” before opening a PR.

2. **memory-bank/PRODUCT.md**
   - Include:
     - Service purpose in 3–5 sentences
     - Bullet list of capabilities / features
     - Key stakeholders / user types
     - 3–7 key user flows in concise stories:
       - “As a <role>, I <do>, so that <benefit>.”
     - Any important business rules/invariants.

3. **memory-bank/ARCHITECTURE.md**
   - Include:
     - Short high-level architecture overview (1–2 paragraphs)
     - List of main components with responsibilities
     - External integrations:
       - What they are, why they matter, and how they are called
     - Important data models / contracts:
       - Name, key fields, important relationships
     - “Design Decisions” section:
       - Bullets for important choices (e.g. queues, frameworks, patterns).

4. **memory-bank/CONTRIBUTING.md**
   - Include:
     - How to run the service locally (commands, environment expectations)
     - How to run tests (unit/integration/e2e)
     - Coding style basics:
       - Lint/format tools, type system, folder conventions
     - Any “do/don’t” rules for contributions (e.g. “prefer feature flags”, “keep
       controller thin”, etc.).

5. **memory-bank/plans/TICKETS.md**
   - Take “Ticket Candidates” from the analysis and convert them into **mini spec blocks**.
   - Structure for each ticket:

     ### [ID] Short Title
     - Status: Backlog
     - Summary:
     - Context:
     - Functional behavior (GIVEN/WHEN/THEN):
     - Technical notes:
     - Tasks:
       - [ ] …

   - If there are many, group them under headings:
     - `## Phase 1 (Current)`
     - `## Backlog / Future`

6. **Optional: memory-bank/plans/{{PHASE_NAME}}-PLAN.md**
   - If there is enough information to propose a short development plan:
     - Create a simple plan file with:
       - Goals for Phase 1
       - 3–10 tickets (IDs) to tackle
       - Rough priorities.

7. **Optional: memory-bank/LONG_TERM_MEMORY.md**
   - Only if the service is “core / business-critical” OR has non-trivial architecture.
   - Include:
     - Core design decisions that must be remembered
     - Important invariants / rules
     - Known risks / tradeoffs
     - Notes for “future self” and future agents (e.g. “If we ever change X, check Y+Z”).

----------------

Read all the info about the game from our conversation. If anything is missing then try to think it through. If anything needs to be asked from me then do so.
