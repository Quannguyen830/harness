# Sources

Every borrowed component, one line each. License texts live in `vendor-licenses/`.

| Component | Upstream | Version / commit | License | Local changes |
|---|---|---|---|---|
| skills/tdd | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; seams come from the feature spec's "Test seams" section; decisions read from `docs/decisions.md`; dropped reference to the non-vendored `code-review` skill |
| skills/diagnosing-bugs | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; decisions read from `docs/decisions.md` |
| skills/domain-modeling | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; ADRs become entries in `docs/decisions.md`; single-context layout only |
| skills/codebase-design | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/` |
| skills/grill | https://github.com/mattpocock/skills (skills/productivity/grilling) | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Method text kept; rounds capped at 5 questions; added feature-folder setup, grill.md recording, finish/commit steps; renamed to `grill` (replaces both `grill-me` and `grilling`) |
| templates/spec.md | https://github.com/github/spec-kit (templates/spec-template.md) | commit 2ee2b1e8005905db05f5717300a469b3068b908f | MIT (vendor-licenses/spec-kit.LICENSE) | Kept prioritised, independently testable user stories; replaced Given/When/Then and FR-ids with EARS acceptance criteria (format by Mavin et al., used by Kiro); added Test seams and Problem/Out-of-scope from mattpocock `to-spec` (MIT, 1.3.1); added harness task list; dropped success-metrics and NEEDS CLARIFICATION markers (gaps are asked instead) |
| skills/execute | https://github.com/obra/superpowers (skills/verification-before-completion) | superpowers 7.0.2 | MIT (vendor-licenses/superpowers.LICENSE) | Only the "evidence before claims" gate is borrowed, condensed into step 6; the rest of the skill (branching, scope, stop-and-ask, docs sync, finish) is harness-specific |
| templates/pr.md | https://github.com/mattpocock/skills (skills/engineering/pr) | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Kept the Summary / Evidence / Merge danger (door, blast radius) structure; added task link, Covers and Docs-in-sync sections; did not copy the visuals menu credited to humanlayer's `show-me` |
