---
description: Run the next harness step. "/next auto" keeps going until a gate; "/next <idea>" starts a new feature.
argument-hint: "[auto | <idea>]"
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Read, Edit, Write, Glob, Grep, Skill
---

You are driving Quan's harness (spec: https://github.com/Quannguyen830/harness/blob/master/docs/spec.md §4).

Arguments: `$ARGUMENTS`

## 1. Read the state

- If the arguments are empty or exactly `auto`, run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/next-state.mjs"`
- Otherwise the arguments are a new idea; run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/next-state.mjs" --idea "<the arguments>"`

The script prints JSON `{ step, reason, feature, task, prs, warning }`. Trust it; do not re-derive the state yourself. If it prints a `warning`, tell Quan in one line.

## 2. Run exactly that step

| step | What you do |
|---|---|
| `init` | Tell Quan to run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-project.mjs"` here (or run it if he asks). Stop. |
| `idle` | Say there is no open feature and ask for the next idea. Stop. |
| `question` | Show the open question(s) (quote the `> QUESTION` block or restate the chat question) with options and your default. Stop. |
| `grill` | Call the Skill tool with `harness:grill`. Pass the idea if there is one. |
| `spec` | Call the Skill tool with `harness:spec` for the feature. |
| `gate-a` | ⛔ Gate A. Tell Quan the spec path and that approving means setting `Status: approved` (or saying "approved" — then you set it and commit `docs: approve spec <feature>`). Stop. |
| `execute` | Call the Skill tool with `harness:execute` for the task. |
| `pr` | Call the Skill tool with `harness:pr` for the current branch. |
| `feedback` | Call the Skill tool with `harness:feedback` for the PR. |
| `gate-b` | ⛔ Gate B. List the PRs waiting for review (number, title, URL). Stop. |
| `done` | Ask Quan for the fit score (1–5 plus one sentence) and append `Fit score: N — <sentence>` to the feature spec; commit `docs: close feature <feature>`. Stop. |

## 3. Auto mode

Only when the arguments are exactly `auto`: after a step finishes, go back to section 1 and run the next step. Stop at `init`, `idle`, `question`, `gate-a`, `gate-b`, `done`, or when a stop-and-ask condition hits. Never merge a PR, never skip a gate, never stack a task branch on an unmerged PR.

Without `auto`, run one step and stop.

## Always

- **Stop-and-ask** (spec §4.6): stop when a requirement is ambiguous, a change would leave the task's scope, contradict a recorded decision, or need an acceptance criterion changed, or when verification failed 3 times. Up to ~3 questions → ask in chat with options and a default. More → write `> QUESTION` blocks under the relevant doc section and tell Quan where.
- **Intervention log** (spec §8): when Quan corrects, redirects or unblocks you, append a draft line to `docs/interventions.md` and show it to him to confirm:
  `date | feature | task | gear | type | what happened | what I wished the system had done`
  Types: `agent-mistake`, `missing-context`, `spec-gap`, `manual-trigger`, `changed-mind`.
- End with one line naming the step you ran and what `/next` will do next.
