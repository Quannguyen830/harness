<!-- harness:project -->
# {{name}}

This repo runs on Quan's harness (Claude Code plugin `harness`). Workflow: type `/next`.

## Where things are
- `docs/product.md` — what the system is today (the current truth)
- `docs/features/<NNN-slug>/` — `grill.md` and `spec.md` per feature, on that feature's branch until its PR is merged
- `docs/decisions.md` — project-wide decisions, append-only
- `docs/interventions.md` — log of every time Quan had to step in
- `harness.json` — `verify` is the command that must pass before work counts as done

## Rules
- Code follows docs: change the spec or product doc first, then the code.
- One feature = one branch `feature/<NNN-slug>` = one PR against `master`; one commit per task. Never commit to `master`, never merge; Quan merges.
- Stop and ask when something is ambiguous, out of the task's scope, contradicts a decision, or needs an acceptance criterion changed. A few questions in chat; a long list as `> QUESTION` blocks in the doc.
- Chat with Quan in Vietnamese; write code, docs and commits in English.

## Project-specific rules
<!-- Add this project's own conventions below. Re-running init-project never touches this file. -->
