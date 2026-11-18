# harness

Quan's personal agentic harness for building software with Claude Code, packaged as a Claude Code plugin.
Spec (source of truth): [docs/spec.md](docs/spec.md).
New here (Quan): start with the guided tour [docs/walkthrough.md](docs/walkthrough.md).

Status: v0.4.0 — workflow v2, workflow rules shipped from the plugin, one version number, and the machine cleaned up so the harness is the only active plugin. See [docs/reports/2026-11-18-v0.4.md](docs/reports/2026-11-18-v0.4.md).

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
| `/next <idea>` | Start a feature on its own branch `feature/<NNN-slug>`: grill (G1). Allowed while other features are open |
| `/next` | Run the one step that is due (across all open features), then stop |
| `/next auto` | Do every step that needs no one, then stop with the list of what waits for Quan (spec approval, PR review, questions) |

## Develop

```bash
npm test               # unit tests (node:test, no dependencies)
npm run selftest       # structural invariants (spec §9)
claude plugin validate .
```

Machine prerequisites: Claude Code, git, gh, Node 22+.
