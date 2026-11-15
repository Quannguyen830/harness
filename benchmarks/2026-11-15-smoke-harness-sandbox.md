# Benchmark 2026-11-15

Harness version: `v0.2.0-dirty`

| Project | Interventions | Harness-fault | Error rate | Task PRs merged | First-pass merge | Rework (G5 rounds/PR) | Fit scores |
|---|---|---|---|---|---|---|---|
| harness-sandbox | 2 | 2 | 100% | 2 | 50% | 0.5 | 001-a-cli-that-counts-words: 4 |

**Overall error rate:** 100% (2 of 2)

## Bottleneck: harness-fault interventions by gear

- execute: 1
- next: 1

## By type

- agent-mistake: 1
- manual-trigger: 1

## Notes

Smoke run, not a benchmark: Claude played Quan (answers "default", approved at Gate A, one review comment, merged both PRs). It checks the machinery, so the error rate here says nothing about harness quality.

- Total: ~11 headless `claude -p` sessions, about $6 of usage, roughly 25 minutes wall time.
- Every gear ran through the real plugin: `harness:grill` (2 rounds), `harness:spec` (12 EARS criteria, check-spec ok), Gate A, `/next auto` (T1 → PR → stopped at Gate B because T2 depends on T1), `harness:feedback` (fixed, logged, `[harness]` reply ignored by /next), T2 → PR, done → fit score.
- Harness bug found: after a squash merge, /next routed a stale task branch to `pr` and read a stale local master. Fixed in the next PR (fetch + ignore branches of ticked tasks + pr skill returns to master).
- Friction outside the harness: the global `~/.claude/CLAUDE.md` report format ("✅ TASK COMPLETE") leaked into execute's output; a machine hook blocked shell commands containing Unicode whitespace.
