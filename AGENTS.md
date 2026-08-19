## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Project Structure & Module Organization

`src/` contains the React/Vite client: route files live in `src/routes/`,
domain UI and API hooks in `src/features/`, and reusable primitives in
`src/components/`. The Bun/Hono API is under `server/`; keep route groups in
`server/routes/`, persistence in `server/database/`, and integrations in
`server/lib/`. Cross-boundary types belong in `shared/`. Vitest unit suites
live in `server/tests/unit/` and `src/tests/unit/`; Vitest
integration tests (HTTP seam against the server entry) live in
`tests/integration/`; Playwright files belong in `tests/e2e/`. Infrastructure

is maintained in `infra/`. Do not edit the generated `src/routeTree.gen.ts`
directly.

## Documentation

Project documentation starts at [`docs/README.md`](docs/README.md). Keep
environment, development, API, architecture, testing, and deployment claims
aligned with the source files linked from those pages. Update `CHANGELOG.md`
for shipped user-visible or infrastructure changes; keep `TODOS.md` for
deferred work rather than presenting it as implemented behavior.

## Agent skills

### Issue tracker

Issues live in Linear project `localoco` under the `Personal` (`PRS`) team.
Pull requests are included in triage. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default labels: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using root `CONTEXT.md` and `docs/adr/`.
See `docs/agents/domain.md`.
