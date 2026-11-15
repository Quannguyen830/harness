# Gear: feedback
- Purpose: Make docs, tasks and code consistent with Quan's review feedback, docs first.
- Triggered when: An open PR has a review, comment or inline comment newer than its last commit (excluding [harness] replies).
- Input: The PR's unaddressed feedback (scripts/pr-feedback.mjs), the feature spec, the branch.
- Output: Spec/docs updated first, then code; verify passes; pushed to the same PR; one interventions.md line per item; one [harness] reply comment.
- Gate: Gate B (the PR goes back to Quan)
- Stop conditions: All items addressed and pushed → Gate B; an item is ambiguous or reaches into another task's scope → stop and ask.
- Components: skills/feedback, scripts/pr-feedback.mjs
- Delete when: Claude Code applies PR review feedback with docs-first discipline and logging on its own.
