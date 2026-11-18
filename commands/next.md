---
description: Run the next harness step. "/next auto" keeps going until something needs Quan; "/next <idea>" starts a new feature.
argument-hint: "[auto | <idea>]"
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Read, Edit, Write, Glob, Grep, Skill
---

You are driving Quan's harness (spec: https://github.com/Quannguyen830/harness/blob/master/docs/spec.md §4).
Workflow: one branch `feature/<NNN-slug>` and one PR per feature; several features may be open at once.

Arguments: `$ARGUMENTS`

## 1. Read the state

- If the arguments are empty or exactly `auto`, run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/next-state.mjs"`
- Otherwise the arguments are a new idea; run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/next-state.mjs" --idea "<the arguments>"`

The script prints JSON `{ step, kind, reason, feature, branch, task, pr, waiting, cleanup, warning }`. Trust it; do not re-derive the state. If there is a `warning`, tell Quan in one line. If there is a `cleanup`, do it first.

## 2. Go to the feature's branch, then run exactly that step

For any step with a `branch`: `git checkout <branch>` and `git pull` (skip the pull if the branch has no upstream yet).

| step | What you do |
|---|---|
| `init` | Offer to run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-project.mjs"` here. Stop. |
| `idle` | Say no feature is open and ask for the next idea. Stop. |
| `question` | Show the open question(s) with options and your default. Stop. |
| `grill` | Call the Skill tool with `harness:grill` (pass the idea if there is one). |
| `spec` | Call the Skill tool with `harness:spec` for the feature. |
| `gate-a` | ⛔ Gate A. Give the draft PR link; approving = saying "approved" here or commenting "approved" on the PR. If Quan says "approved" in chat: set `> Status: approved` in the spec, commit `docs(<NNN>): approve spec`, push. Stop. |
| `execute` | Call the Skill tool with `harness:execute` for the task. |
| `pr` | Call the Skill tool with `harness:pr` for the feature. |
| `feedback` | Call the Skill tool with `harness:feedback` for the PR. |
| `gate-b` | ⛔ Gate B. Give the PR link; ask Quan to review, comment `Fit: N — <one sentence>`, and merge. Stop. |

## 3. Auto mode

Only when the arguments are exactly `auto`: after a step finishes, go back to section 1. Keep going while `kind` is `work`; stop at the first step whose `kind` is `needs-quan` (or `init`/`idle`), or when a stop-and-ask condition hits. Never merge a PR, never skip a gate. When you stop, list everything in `waiting` too.

Without `auto`, run one step and stop.

## Always

- **Stop-and-ask** (spec §4.7): stop when a requirement is ambiguous, a change would leave the task's scope, contradict a recorded decision, or need an acceptance criterion changed, or when verification failed 3 times. Up to ~3 questions → ask in chat with options and a default. More → write `> QUESTION` blocks under the relevant doc section and tell Quan where; he may answer in chat, then you fold the answers into the doc.
- **Intervention log** (spec §8): when Quan corrects, redirects or unblocks you, append a draft line to `docs/interventions.md` on the feature branch and show it to him to confirm:
  `date | feature | task | gear | type | what happened | what I wished the system had done`
  Types: `agent-mistake`, `missing-context`, `spec-gap`, `manual-trigger`, `changed-mind`.
- Never commit to `master` directly; everything reaches `master` through the feature PR, merged by Quan.
- End with one line naming the step you ran and what `/next` will do next (including anything waiting for Quan).
