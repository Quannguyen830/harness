---
name: feedback
description: Harness gear G5. Apply Quan's review comments on an open PR — docs first, then code — verify, push to the same PR, and log each comment as an intervention. Use when /next picks the feedback step.
---

# G5 Feedback

Quan left review feedback on a PR. Make docs, tasks and code consistent with it again, on the same branch.

## 1. Collect

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pr-feedback.mjs" <number>`. It lists every review, comment and inline comment newer than the PR's last commit (your own `[harness]` replies are excluded). Check out the PR's branch and pull it.

## 2. Classify each item

| Item | What you do |
|---|---|
| Changes what the feature should do (criterion, scope, decision) | Update the feature spec first (and `docs/decisions.md` if it outlives the feature), then the code |
| Code-level change within the spec | Change the code (and tests at the spec's seams) |
| A question | Answer it in your reply; change nothing unless the answer shows a defect |
| Ambiguous, or would change another task's scope | Stop and ask (a few in chat; many as `> QUESTION` blocks in the spec) |

If a spec change affects tasks other than this one, update those task lines in the spec too and say so in your reply.

## 3. Apply — docs first, then code

1. Edit the docs, then the code, test-first where behaviour changes (`harness:tdd`).
2. Run the `verify` command from `harness.json` and read the result. Don't push on red.

## 4. Log every item (harness spec §8)

Append one line per feedback item to `docs/interventions.md` on this branch:

```
| <date> | <feature> | <task> | <gear that produced the issue: grill/spec/execute/pr> | <type> | <what Quan pointed out> | <what the system should have done> |
```

Type is about whose fault it was: `agent-mistake` (spec was clear, agent got it wrong), `missing-context`, `spec-gap` (spec was vague or missing it), `manual-trigger`, or `changed-mind` (Quan changed his mind: not a harness fault). Pick honestly; this log is how the harness improves. Quan confirms or edits these lines when he reviews.

## 5. Push and reply

1. Commit: `fix(<Tn>): address review — <short summary>`; push to the same branch.
2. Post one PR comment that starts with `[harness]` and lists each item → what changed (or the answer). The `[harness]` prefix keeps /next from treating your reply as new feedback.
3. Never merge. Say in one line that the PR is ready for another look (Gate B).
