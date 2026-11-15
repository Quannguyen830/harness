# Gear: spec
- Purpose: Turn the grill log into a testable, consistent feature spec with a task list.
- Triggered when: The current feature's grill.md is Status: done and it has no spec.md.
- Input: grill.md, docs/product.md, docs/decisions.md, the codebase.
- Output: docs/features/<NNN-slug>/spec.md (Status: draft) that passes check-spec; committed to master.
- Gate: Gate A (Quan approves by setting Status: approved)
- Stop conditions: Spec written and check-spec passes → Gate A; more than ~3 unanswered gaps → > QUESTION blocks and stop.
- Components: skills/spec, templates/spec.md, scripts/check-spec.mjs
- Delete when: Claude Code produces specs of this shape from a grill log without a template.
