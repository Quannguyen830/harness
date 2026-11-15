# Gear: next
- Purpose: Pick and run the one workflow step that is due, so Quan only ever types /next.
- Triggered when: Quan types /next, /next auto, or /next <idea>.
- Input: Project state: docs/features/*, docs/*.md, git branch, open PRs on GitHub.
- Output: The chosen step's output (from the gear it calls), plus one line on what comes next.
- Gate: none (it stops at Gate A and Gate B; it never passes them)
- Stop conditions: init, idle, question, gate-a, gate-b, done; any stop-and-ask condition; in auto mode the same list ends the loop.
- Components: commands/next.md, scripts/next-state.mjs, scripts/lib/state.mjs
- Delete when: Claude Code can route a declared workflow from project state on its own.
