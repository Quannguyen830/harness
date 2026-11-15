# Gear: execute
- Purpose: Build one task from the approved spec on its own branch, test-first and verified.
- Triggered when: The current feature's spec is approved and a task is ready (unchecked, not in flight, dependencies merged), or the current branch is that task's unfinished branch.
- Input: One task + the feature spec, docs/product.md, docs/decisions.md, the codebase.
- Output: Branch task/<NNN>-<Tn>-<slug> with code, tests, synced docs and the task's checkbox ticked; verify passes; working tree clean.
- Gate: none
- Stop conditions: Task done and verified; or a stop-and-ask condition (ambiguity, out of scope, contradicts a decision, criterion would change, verify failed 3 times).
- Components: skills/execute, skills/tdd, hooks/hooks.json, hooks/verify.mjs
- Delete when: Claude Code enforces spec-scoped, test-first, verified task execution on its own.
