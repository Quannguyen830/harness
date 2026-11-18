---
name: grill
description: Harness gear G1. Interview Quan relentlessly about a feature idea and record it in docs/features/<NNN-slug>/grill.md. Use when /next picks the grill step, or when Quan asks to be grilled on an idea.
---

# G1 Grill

Interview Quan until you both understand the feature, and keep the record in the feature's `grill.md`. The record is the only input G2 Spec gets, so anything not written there is lost.

## Start

1. New idea: commit or stash nothing of yours first (the tree must be clean), then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/new-feature.mjs" "<idea>"`. It creates branch `feature/<NNN-slug>` from the latest `master`, writes `docs/features/<NNN-slug>/grill.md`, and prints both. Other open features are untouched.
2. Continuing: you are on the feature's branch; open its `grill.md` and continue from the last round.
3. Read `docs/product.md` and `docs/decisions.md` first, and `GLOSSARY.md` if it exists. Don't ask what they already answer.

## Method (from mattpocock `grilling`)

Map the idea as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the frontier in one round, at most 5 questions (the most load-bearing first; the rest wait for the next round). Number each question and give your recommended answer. Then wait for Quan's answers.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might include multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - ...
```

Word each question so "yes" accepts your recommended answer. Quan may answer tersely ("1 yes, 2 B, 3 default"); "default" means your recommendation.

Each round reshapes the tree: settled decisions push the frontier outward. A question whose answer depends on another question still open in this round belongs to a later round.

When a question is about how something should look or behave and words won't settle it, call the Skill tool with `harness:prototype` and show a throwaway prototype instead of asking in the abstract. Prototypes are never committed to the feature branch.

Finding _facts_ is your job, never Quan's. When a question needs a fact from the environment (files, tools, docs), look it up (or dispatch a sub-agent) instead of asking. The _decisions_ are Quan's.

Cover, in roughly this order: the problem and who has it · what done looks like (observable behaviour) · scope and explicit non-goals · data and edge cases · constraints (tech, time, platform) · how it will be tested (the public seams) · how to split it into independently shippable slices.

## Record every round

After each round's answers, append to `grill.md` under `## Rounds`:

```markdown
### Round N
- Q1 <title>: <question in one line> ➡️ <recommendation> — A: <Quan's answer>
```

Keep `## Decisions` current (one line per settled decision) and `## Open questions` for anything Quan explicitly leaves open. Chat in Quan's language; write the file in English.

## Finish

The grill is done when the frontier is empty, or when Quan says the idea is clear enough. Then:

1. Set `Status: done` in `grill.md`.
2. Commit it on the feature branch: `docs(<NNN>): grill` and push with `git push -u origin feature/<NNN-slug>`.
3. Say in one line that `/next` will now write the spec.

Do not write the spec or any code here.
