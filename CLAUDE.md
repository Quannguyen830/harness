# Harness — rules for agents working in this repo

This repo is Quan's personal agentic harness, packaged as a Claude Code plugin.
The source of truth is `docs/spec.md`. Read it before doing anything.

## Rules
- Do not add a gear without a contract in `gears/` and Quan's approval.
- Every borrowed file gets a `SOURCES.md` entry (upstream, version, license, local changes).
- One component per job: check `skills/`, `commands/`, `hooks/`, `agents/` before adding.
- Prefer deleting over adding options.
- Ask questions as in spec §4.6: a few in chat, a long list in the doc.
- Keep changes small: one gear per PR, branched from the latest `master`.
- Never change `~/.claude` without Quan's item-by-item approval.
- Quan must understand every change (spec principle 12): explain the step first and wait for him; keep `docs/walkthrough.md` in sync.
- When editing a skill, `CLAUDE.md` or any doc an agent reads, follow `skills/writing-for-agents`.
- Run `node scripts/selftest.mjs` before opening a PR.

## Map
- `gears/` — contracts, one file per workflow step
- `skills/`, `commands/`, `hooks/`, `agents/`, `templates/` — components
- `scripts/` — init-project, selftest, upstream-diff, collect-logs
- `vendor-licenses/` — upstream license texts for borrowed components
- `benchmarks/` — one file per run
