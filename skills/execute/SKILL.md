---
name: execute
description: Harness gear G3. Build ONE task from an approved feature spec on its own branch, test-first at the spec's seams, verified, with the task's checkbox ticked. Use when /next picks the execute step.
---

# G3 Execute

Build exactly one task, as the approved spec describes it, and leave a verified branch ready for a PR.

## 1. Set up the branch

- If you are already on this task's branch (`task/<NNN>-<Tn>-<slug>`), continue there.
- Otherwise: `git checkout master`, `git pull`, then `git checkout -b task/<NNN>-<Tn>-<short-slug>` (NNN = feature number). Always from the latest default branch; never from another task's unmerged branch.

## 2. Load the context

Read the whole feature spec, not just the task line: the criteria the task covers, the test seams, the decisions, the non-goals. Read `docs/product.md`, `docs/decisions.md`, `GLOSSARY.md` if present, and the code you will change.

Before writing anything, state in one short list which files or modules you expect to touch and which you won't.

## 3. Stop and ask when (harness spec §4.6)

- a requirement is ambiguous or missing from the spec;
- the task needs a change outside its scope (other tasks' criteria, unrelated modules);
- the change would contradict a decision in the spec or `docs/decisions.md`;
- tests can't pass without changing an acceptance criterion;
- verification failed 3 times in a row.

Up to ~3 questions → ask in chat with options and your default. More → write `> QUESTION (task Tn): ...` blocks under the relevant spec section and tell Quan where. Never resolve these by guessing.

## 4. Build test-first

Call the Skill tool with `harness:tdd` and follow it: one acceptance criterion at a time, red then green, tests only at the spec's test seams. Name tests after the behaviour in the criterion.

Keep the change minimal: no features, refactors or options the task doesn't ask for.

Make tests reviewable: write invisible or non-ASCII characters as escapes (` `, `\t`), and when a criterion lists several cases (kinds of whitespace, error codes), cover them together in at least one test. (Learned from the first live run: a reviewer could not see literal NBSPs in a test.)

## 5. Keep docs in sync (code follows docs)

- If you learn the spec is wrong, stop and ask; don't silently build something else.
- If the task records a decision that outlives the feature, add it to `docs/decisions.md`.
- If this task is the one that updates `docs/product.md`, update it to describe the system as it now is.

## 6. Verify — evidence before claims (from superpowers `verification-before-completion`)

Run the project's verify command from `harness.json` yourself, read the full output and the exit code. Only claim the task is done with that fresh evidence in front of you. "Should pass" and earlier runs don't count. Also re-read each criterion the task covers and confirm, one by one, how it is now met.

The plugin's Stop hook runs the same command whenever you try to stop with code changes. If it blocks you, fix the cause; after 3 failures it lets you stop so Quan can look.

## 7. Finish

1. Tick the task in the spec on this branch: `- [x] Tn: ...`.
2. Commit with a message naming the task: `feat(Tn): <what it does>` (or `fix(Tn): ...`). Make sure the working tree is clean.
3. Say in one line which criteria are met and that `/next` will open the PR. Do not push or open the PR here; G4 does that.
