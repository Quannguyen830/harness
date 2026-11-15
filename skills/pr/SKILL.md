---
name: pr
description: Harness gear G4. Push a finished task branch and open ONE PR against master that links the task, the acceptance criteria it covers, evidence and a docs-in-sync checklist; then stop at Gate B. Use when /next picks the pr step.
---

# G4 PR

Turn a finished, verified task branch into one PR Quan can review quickly at Gate B.

## Check first

- You are on `task/<NNN>-<Tn>-<slug>`, the working tree is clean, the task is ticked in the spec on this branch.
- Run the `verify` command from `harness.json` now and keep its output for the Evidence section. If it fails, don't open the PR: go back to `harness:execute`.
- If the default branch moved, rebase onto it (`git fetch`, `git rebase origin/master`) and re-run verify. On conflicts you can't resolve inside the task's scope, stop and ask.

## Write the body

Fill `${CLAUDE_PLUGIN_ROOT}/templates/pr.md`:

- **Covers:** every acceptance criterion the task lists, each with how it's met and the test that shows it.
- **Summary:** the smallest view that makes the change clear (file tree, call tree, diff sketch or pseudocode). No preamble.
- **Evidence:** the fresh verify output (trimmed to the result lines) and a before/after for behaviour.
- **Merge danger:** two-way door if it is cheap to revert; one-way if it migrates data, deletes things or changes a public contract. Blast radius in one word.
- **Docs in sync?:** tick only what is true.

End the body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Open it

1. `git push -u origin <branch>`
2. `gh pr create --base master --title "feat(<Tn>): <what it does>" --body-file <file>`
3. Never merge, approve or enable auto-merge. Quan merges at Gate B.
4. Switch back: `git checkout master` and `git pull`, so the next step never starts from this branch.

Say in one line: the PR URL, and that `/next` (or `/next auto`) will pick the next independent task or stop at Gate B.
