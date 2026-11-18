# Gear: execute
- Purpose: Build one task from the approved spec as one verified commit on the feature branch.
- Triggered when: An open feature's spec is approved and a task is ready (unchecked, dependencies ticked).
- Input: One task + the feature spec, docs/product.md, docs/decisions.md, the codebase.
- Output: One commit feat(<NNN>/Tn) on feature/<NNN-slug> with code, tests, synced docs and the task ticked; verify passes; pushed.
- Gate: none
- Stop conditions: Task done and verified; or a stop-and-ask condition (ambiguity, out of scope, contradicts a decision, criterion would change, verify failed 3 times).
- Components: skills/execute, skills/tdd, hooks/hooks.json, hooks/verify.mjs
- Delete when: Claude Code enforces spec-scoped, test-first, verified task execution on its own.
