# Gear: grill
- Purpose: Turn a raw idea into a shared, written understanding before any spec exists.
- Triggered when: /next gets an idea (always allowed), or an open feature's grill.md is missing or not Status: done.
- Input: The idea (free text), docs/product.md, docs/decisions.md.
- Output: Branch feature/<NNN-slug> with docs/features/<NNN-slug>/grill.md (rounds, decisions, open questions, Status: done), pushed.
- Gate: none
- Stop conditions: Quan says the idea is clear enough, or the frontier is empty.
- Components: skills/grill, skills/prototype, templates/grill.md, scripts/new-feature.mjs
- Delete when: Claude Code ships an interview mode that writes an equivalent log on its own.
