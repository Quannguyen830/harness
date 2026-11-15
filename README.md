# harness

Quan's personal agentic harness for building software with Claude Code, packaged as a Claude Code plugin.
Spec (source of truth): [docs/spec.md](docs/spec.md).

```
upstream skills (mattpocock, superpowers, Spec Kit, ...)  →  harness (this repo)  →  your projects
```

## Install (once per machine)

```bash
claude plugin marketplace add Quannguyen830/harness
claude plugin install harness@harness
```

For development, load the working copy instead: `claude --plugin-dir D:/Driver_D/harness`.

## Develop

```bash
npm test               # unit tests (node:test, no dependencies)
npm run selftest       # structural invariants (spec §9)
claude plugin validate .
```

Machine prerequisites: Claude Code, git, gh, Node 22+.
