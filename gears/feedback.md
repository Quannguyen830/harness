# Gear: feedback
- Purpose: Handle every unanswered comment on a feature PR: approval, fit score, spec changes (docs first), code changes, questions.
- Triggered when: A comment on an open feature PR has no [harness] reply after it.
- Input: The unanswered comments (scripts/pr-feedback.mjs), the feature spec, the branch.
- Output: Docs first, then code; verify passes; pushed to the same branch; one interventions.md line per correction; one [harness] reply.
- Gate: none (the PR returns to Gate A or Gate B)
- Stop conditions: All items handled and replied to; an item is ambiguous or reaches into another feature → stop and ask.
- Components: skills/feedback, scripts/pr-feedback.mjs
- Delete when: Claude Code applies PR review feedback with docs-first discipline and logging on its own.
