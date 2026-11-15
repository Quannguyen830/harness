# Gear: pr
- Purpose: Turn a finished task branch into one reviewable PR against master.
- Triggered when: The current branch is a task branch with the task ticked, commits ahead of master, a clean tree, and no open PR.
- Input: The task branch, the feature spec, fresh verify output.
- Output: One open PR (title feat(Tn): ...) whose body links the task, its criteria, evidence, merge danger and a docs-in-sync checklist.
- Gate: Gate B (Quan reviews and merges)
- Stop conditions: PR opened → Gate B; verify fails → back to execute; rebase conflict outside the task's scope → stop and ask.
- Components: skills/pr, templates/pr.md
- Delete when: Claude Code opens PRs in this shape from a task spec on its own.
