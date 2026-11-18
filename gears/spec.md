# Gear: spec
- Purpose: Turn the grill log into a testable, consistent feature spec with a task list, and open the feature's draft PR.
- Triggered when: An open feature's grill.md is Status: done and it has no spec.md, or no draft PR yet.
- Input: grill.md, docs/product.md, docs/decisions.md, the codebase.
- Output: spec.md (Status: draft) that passes check-spec, committed on the feature branch; a draft PR to master.
- Gate: Gate A (Quan approves by saying or commenting "approved")
- Stop conditions: Spec written, check-spec passes, draft PR open → Gate A; more than ~3 unanswered gaps → > QUESTION blocks and stop.
- Components: skills/spec, templates/spec.md, scripts/check-spec.mjs
- Delete when: Claude Code produces specs of this shape from a grill log without a template.
