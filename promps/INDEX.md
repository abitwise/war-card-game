# AI Agent Workflow

1. Product preparation
Initially work on the product, describe it and create agent context/memory bank with backlog of tickets
-> For this I used ChatGPT GPT 5.2
-> Check out prompts/memory-bank-creation-prompt.md, this is simplistic version, there are more sophisticated ways

3. Create repository and set up memory bank

4. Development cycle
  a. Feed the repository with development prompt to Codex agent, add info about next phase and ticket, agent produces results ticket-by-ticket.
  b. Create PR (codex created feature branch) to Main
  c. Ask Github Copilot review agent to implement selected suggestions (or all if in yolo mode)
  d. Review (skip in yolo) and merge the implemented suggestions (merges to the feature branch created by Codex agent)
  e. Review (if you are in yolo-mode you can skip it) & Merge feature branch to Main
  f. Repeat
