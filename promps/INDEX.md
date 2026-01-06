# AI Agent Workflow

## 1. Product preparation
- Initially work on the product, describe it and create agent context/memory bank with backlog of tickets
  - -> For this I used ChatGPT GPT 5.2
  - -> Check out prompts/memory-bank-creation-prompt.md, this is simplistic version, there are more sophisticated ways

## 2. Create repository and set up memory bank
- I recommend to use Github for this, set up repository, configure Codex environment and start creating memory bank in the repository.

## 3. Development cycle
- Feed the repository with development prompt to Codex agent, add info about next phase and ticket, agent produces results ticket-by-ticket.
- Create PR (codex created feature branch) to Main
- Ask Github Copilot review agent to implement selected suggestions (or all if in yolo mode)
- Review (skip in yolo) and merge the implemented suggestions (merges to the feature branch created by Codex agent)
- Review (if you are in yolo-mode you can skip it) & Merge feature branch to Main
- Repeat
