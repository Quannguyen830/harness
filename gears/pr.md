# Gear: pr
- Purpose: Self-review the finished feature branch against its spec and make the feature PR ready for Quan.
- Triggered when: Every task of an open feature is ticked and its PR is still a draft.
- Input: The feature branch, the feature spec, fresh verify output.
- Output: Self-review fixes committed; PR body filled from templates/pr.md; PR marked ready for review.
- Gate: Gate B (Quan reviews, comments the fit score, merges)
- Stop conditions: PR ready → Gate B; verify fails or a finding would change the spec → stop and ask; rebase conflict outside the feature's scope → stop and ask.
- Components: skills/pr, skills/code-review, templates/pr.md
- Delete when: Claude Code self-reviews against a spec and opens PRs in this shape on its own.
