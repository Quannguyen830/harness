# Gears

One contract per workflow step (spec §5). Copy `templates/gear-contract.md` to add one — only with Quan's approval.

`scripts/selftest.mjs` checks that every component a contract names exists, and that every component is used by a gear or listed below.

## On-demand components

Components no gear calls; agents or Quan use them when needed.

- On-demand: skills/diagnosing-bugs, skills/domain-modeling, skills/codebase-design, skills/find-docs, skills/frontend-design, skills/writing-for-agents

MCP servers (declared in `.mcp.json`, spec §3.2): `playwright` — browser automation for testing web UIs. Pin exact versions; never `@latest`.
