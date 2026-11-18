---
name: pr
description: Harness gear G4. When every task of a feature is committed, self-review the feature branch against the spec with code-review, fix what it finds, fill the PR body, and mark the draft PR ready; then stop at Gate B. Use when /next picks the pr step.
---

# G4 PR

All tasks of the feature are ticked and committed on `feature/<NNN-slug>`. Make the feature PR ready for Quan's review at Gate B, so that his review finds as little as possible.

## 1. Bring the branch up to date

`git fetch`, then `git rebase origin/master` if `master` moved, and `git push --force-with-lease`. On conflicts you can't resolve inside the feature's scope, stop and ask.

## 2. Self-review against the spec

Call the Skill tool with `harness:code-review`, fixed point `master`, spec `docs/features/<NNN-slug>/spec.md`. It reports two axes: **Standards** and **Spec**.

- Fix every hard violation and every Spec finding (missing or wrong criterion, scope creep) inside the feature's scope, test-first where behaviour changes. One commit: `fix(<NNN>): self-review`.
- Judgement-call smells: fix them if cheap; otherwise list them in the PR body under "Known judgement calls".
- A finding that would change the spec or another feature: stop and ask.

## 3. Verify

Run the `verify` command from `harness.json`, read the result, and keep its output for the Evidence section. Don't continue on red.

## 4. Fill the PR body and mark it ready

Fill `${CLAUDE_PLUGIN_ROOT}/templates/pr.md`:

- **Tasks:** each task with its commit and the criteria it covers.
- **Covers:** every acceptance criterion with how it's met and the test that shows it.
- **Summary:** the smallest view that makes the change clear (file tree, call tree, diff sketch or pseudocode).
- **Evidence:** fresh verify output (result lines) and a before/after for behaviour.
- **Self-review:** one line per axis with what was found and fixed.
- **Merge danger:** two-way door if cheap to revert; one-way if it migrates data, deletes things or changes a public contract. Blast radius in one word.
- **Docs in sync?:** tick only what is true.

End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Then: `gh pr edit <number> --body-file <file>` and `gh pr ready <number>`. Never merge, approve or enable auto-merge.

## 5. Stop at Gate B

Give Quan the PR link and ask him to review, comment `Fit: N — <one sentence>` (1 = faster to do it myself, 3 = got there with a lot of correcting, 5 = exactly what I wanted), and merge.
