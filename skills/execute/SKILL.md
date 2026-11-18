---
name: execute
description: Harness gear G3. Build ONE task from an approved feature spec as one commit on the feature branch, test-first at the spec's seams, verified, with the task's checkbox ticked. Use when /next picks the execute step.
---

# G3 Execute

Build exactly one task, as the approved spec describes it, as one verified commit on the feature branch.

## 1. Be on the feature branch

`/next` has already checked out `feature/<NNN-slug>` and pulled it. Make sure the working tree is clean and the task is the next unchecked one whose dependencies are ticked. Never create a separate branch for a task.

## 2. Load the context

Read the whole feature spec, not just the task line: the criteria the task covers, the test seams, the decisions, the non-goals. Read `docs/product.md`, `docs/decisions.md`, `GLOSSARY.md` if present, and the code you will change.

Before writing anything, state in one short list which files or modules you expect to touch and which you won't.

## 3. Stop and ask when (harness spec §4.7)

- a requirement is ambiguous or missing from the spec;
- the task needs a change outside its scope (other tasks' criteria, unrelated modules);
- the change would contradict a decision in the spec or `docs/decisions.md`;
- tests can't pass without changing an acceptance criterion;
- verification failed 3 times in a row.

Up to ~3 questions → ask in chat with options and your default. More → write `> QUESTION (task Tn): ...` blocks under the relevant spec section and tell Quan where. Never resolve these by guessing.

## 4. Build test-first

Call the Skill tool with `harness:tdd` and follow it: one acceptance criterion at a time, red then green, tests only at the spec's test seams. Name tests after the behaviour in the criterion.

Keep the change minimal: no features, refactors or options the task doesn't ask for.

Make tests reviewable: write invisible or non-ASCII characters as escapes (`\u00a0`, `\t`), and when a criterion lists several cases (kinds of whitespace, error codes), cover them together in at least one test. (Learned from the first live run: a reviewer could not see literal NBSPs in a test.)

## 5. Keep docs in sync (code follows docs)

- If you learn the spec is wrong, stop and ask; don't silently build something else.
- If the task records a decision that outlives the feature, add it to `docs/decisions.md`.
- If this task is the one that updates `docs/product.md`, update it to describe the system as it now is.

## 6. Verify — evidence before claims (from superpowers `verification-before-completion`)

Run the project's verify command from `harness.json` yourself, read the full output and the exit code. Only claim the task is done with that fresh evidence in front of you. "Should pass" and earlier runs don't count. Also re-read each criterion the task covers and confirm, one by one, how it is now met.

The plugin's Stop hook runs the same command whenever you try to stop with code changes. If it blocks you, fix the cause; after 3 failures it lets you stop so Quan can look.

## 7. Finish

1. Tick the task in the spec: `- [x] Tn: ...`.
2. Make **one commit** for the task, code and docs together: `feat(<NNN>/Tn): <what it does>` (or `fix(<NNN>/Tn): ...`). The working tree must be clean afterwards.
3. Push the branch (the draft PR updates itself).
4. Say in one line which criteria are met and what `/next` does next: the next ready task, or G4 when every task is ticked.
