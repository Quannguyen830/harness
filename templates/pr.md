Feature: `{{feature}}` · Spec: `docs/features/{{feature}}/spec.md`

## Tasks

<!-- One line per task: T<n> — <title> — <commit sha> — covers A1, A2 -->
- T1 — <title> — <sha> — covers A1

## Covers

<!-- One line per acceptance criterion, and how it is met (test name). -->
- A1: <criterion, short> — <how it is met; test name>

## Summary

<!-- The smallest view that makes the change clear: a file tree, call tree, diff sketch or pseudocode. Skip prose. -->

## Evidence

<!-- Fresh output of the verify command, and before/after for behaviour (failing → passing test, CLI output, screenshot). -->

## Self-review

- Standards: <what was found / fixed>
- Spec: <what was found / fixed>
- Known judgement calls: <or "none">

## Merge danger

**Door:** <one-way | two-way> · **Blast radius:** <one word>

## Docs in sync?

- [ ] Spec still describes what this PR does (no silent deviations)
- [ ] Every task is ticked in the spec
- [ ] `docs/decisions.md` updated if a lasting decision was made
- [ ] `docs/product.md` describes the system after this feature

**Quan:** review, comment `Fit: N — <one sentence>` (1–5), then merge.
