# harness

Quan's personal agentic harness for building software with Claude Code, packaged as a Claude Code plugin.
Spec (source of truth): [docs/spec.md](docs/spec.md).

Status: v0.2 built (all gears); not yet validated with a live agent run — see [docs/reports/2026-11-15-build.md](docs/reports/2026-11-15-build.md).

```
upstream skills (mattpocock, superpowers, Spec Kit, ...)  →  harness (this repo)  →  your projects
```

## Install (once per machine)

```bash
claude plugin marketplace add Quannguyen830/harness
claude plugin install harness@harness
```

For development, load the working copy instead: `claude --plugin-dir D:/Driver_D/harness`.

## Start a project

In the project repo (empty or existing):

```bash
node <harness>/scripts/init-project.mjs --verify "npm test"
```

It creates `harness.json`, `CLAUDE.md` and `docs/` (never overwriting). Commit them, open Claude Code there and type `/next <idea>`.
Inside a Claude session `/next` will offer to run it for you (`${CLAUDE_PLUGIN_ROOT}` is the plugin path).

| Command | What happens |
|---|---|
| `/next <idea>` | Start a feature: grill (G1) |
| `/next` | Run the one step that is due, then stop |
| `/next auto` | Keep going until a gate (spec approval, PR review) or a question |

## Develop

```bash
npm test               # unit tests (node:test, no dependencies)
npm run selftest       # structural invariants (spec §9)
claude plugin validate .
```

Machine prerequisites: Claude Code, git, gh, Node 22+.
