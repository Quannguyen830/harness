---
name: spec
description: Harness gear G2. Turn a finished grill log into docs/features/<NNN-slug>/spec.md — problem, scope, EARS acceptance criteria, test seams, decisions and a task list — then stop at Gate A. Use when /next picks the spec step.
---

# G2 Spec

Write the feature spec Quan will approve at Gate A. After approval it is the contract every task is built and reviewed against, so it must be complete, testable and consistent.

## Inputs

- `docs/features/<NNN-slug>/grill.md` (must be `Status: done`) — the only source of requirements. Don't invent requirements it doesn't support.
- `docs/product.md` (what exists today), `docs/decisions.md`, `GLOSSARY.md` if present, and the codebase itself (explore it yourself; prefer existing modules and seams).

## Write the spec

Copy `${CLAUDE_PLUGIN_ROOT}/templates/spec.md` to `docs/features/<NNN-slug>/spec.md` and fill every section. Use the project's domain vocabulary.

- **Problem / Scope:** from the user's point of view. Put everything the grill ruled out under non-goals.
- **User stories:** prioritised (P1, P2, ...). Each one is an independently shippable slice with its own independent test.
- **Acceptance criteria:** EARS, one observable behaviour per line, ids `A1, A2, ...`, each tagged with its story. Write criteria a test or a person can check without asking you. Cover the edge cases and failure paths the grill surfaced.
- **Test seams:** as few as possible, as high as possible (ideally one). Prefer existing seams. One line each: what it catches, what it misses. These are the only places tasks may put tests.
- **Decisions:** feature-local decisions from the grill and your exploration. A decision that will outlive the feature also gets an entry in `docs/decisions.md` (format: `${CLAUDE_PLUGIN_ROOT}/skills/domain-modeling/ADR-FORMAT.md`).
- **Tasks:** vertical slices, one branch and one PR each, small enough to review in one sitting. Each task names the criteria it covers and its dependencies: `- [ ] T3: <title> (covers: A2, A5) (after: T1)`. Keep dependencies minimal so tasks can run independently. Every criterion is covered by at least one task. The last task updates `docs/product.md`.

Do not write code, file paths or snippets into the spec; they go stale.

## Gaps

If the grill log doesn't settle something the spec needs: up to ~3 such gaps → ask Quan in chat with options and your default; more → write `> QUESTION` blocks under the relevant sections and tell Quan where. Don't guess, and don't leave placeholders.

## Check and stop at Gate A

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs" docs/features/<NNN-slug>/spec.md` and fix every problem it reports.
2. Keep `> Status: draft`. Commit on the default branch: `docs: spec <NNN-slug>` and push.
3. ⛔ Gate A: give Quan a short summary in chat (in his language): the stories, the riskiest decisions, the task list with dependencies, and the test seams. Tell him approving means setting `Status: approved` or saying "approved". Stop.
