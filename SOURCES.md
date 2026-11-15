# Sources

Every borrowed component, one line each. License texts live in `vendor-licenses/`.

| Component | Upstream | Version / commit | License | Local changes |
|---|---|---|---|---|
| skills/tdd | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; seams come from the feature spec's "Test seams" section; decisions read from `docs/decisions.md`; dropped reference to the non-vendored `code-review` skill |
| skills/diagnosing-bugs | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; decisions read from `docs/decisions.md` |
| skills/domain-modeling | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/`; ADRs become entries in `docs/decisions.md`; single-context layout only |
| skills/codebase-design | https://github.com/mattpocock/skills | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Removed `agents/` |
| skills/grill | https://github.com/mattpocock/skills (skills/productivity/grilling) | mattpocock-skills 1.3.1 | MIT (vendor-licenses/mattpocock-skills.LICENSE) | Method text kept; rounds capped at 5 questions; added feature-folder setup, grill.md recording, finish/commit steps; renamed to `grill` (replaces both `grill-me` and `grilling`) |
