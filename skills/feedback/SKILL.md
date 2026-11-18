---
name: feedback
description: Harness gear G5. Handle Quan's comments on a feature PR — approval, fit score, spec changes (docs first), code changes, questions — verify, push to the same branch, log each correction, and reply with a [harness] comment. Use when /next picks the feedback step.
---

# G5 Feedback

Quan commented on a feature PR (at Gate A, at Gate B, or in between). Handle every unanswered comment so docs, tasks and code are consistent again, on the same branch.

## 1. Collect

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pr-feedback.mjs" <number>`. It lists every review, comment and inline comment posted after your last `[harness]` reply. You are on the PR's branch, pulled.

## 2. Classify each item

| Item | What you do |
|---|---|
| **"approved"** (Gate A) | Set `> Status: approved` in the spec |
| **`Fit: N — <sentence>`** (Gate B) | Append `Fit score: N — <sentence>` as the last line of the spec |
| Changes *what* the feature should do (criterion, scope, a decision, a task) | **Spec first:** edit the spec (and `docs/decisions.md` if it outlives the feature), then the code. If the spec isn't approved yet, editing the spec is all there is |
| Changes *how*, within the spec | Change the code and tests at the spec's seams |
| A question | Answer it in your reply; change nothing unless the answer shows a defect |
| Ambiguous, or reaches into another feature | Stop and ask (a few in chat; many as `> QUESTION` blocks in the spec) |

If a spec change touches tasks already committed, rework their code in this same branch and say which tasks in your reply. If it adds work, add a task line (unticked) so `/next` builds it.

## 3. Apply — docs first, then code

1. Edit the docs, then the code, test-first where behaviour changes (`harness:tdd`).
2. If code changed, run the `verify` command from `harness.json` and read the result. Don't push on red.

## 4. Log every correction (harness spec §8)

For every item except "approved", fit scores and plain questions, append one line to `docs/interventions.md` on this branch:

```
| <date> | <feature> | <task or -> | <gear that produced the issue: grill/spec/execute/pr> | <type> | <what Quan pointed out> | <what the system should have done> |
```

Type is about whose fault it was: `agent-mistake` (spec was clear, agent got it wrong), `missing-context`, `spec-gap` (spec was vague or missing it), `manual-trigger`, or `changed-mind` (Quan changed his mind: not a harness fault). Pick honestly; this log is how the harness improves. Quan confirms or edits the lines when he reviews.

## 5. Commit, push, reply

1. One commit: `docs(<NNN>): ...` if only docs changed, else `fix(<NNN>): address review — <short summary>`; push.
2. Post **one** PR comment that starts with `[harness]` and lists each item → what changed (or the answer). The comment marks everything before it as handled; never skip it, even when nothing needed changing.
3. Never merge. Say in one line what `/next` does next (e.g. back to Gate A/B, or the next task).
