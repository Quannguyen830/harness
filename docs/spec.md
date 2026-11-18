# Harness — Spec v0.4

> Status: draft for Quan's review (v0.3 was approved on 2026-11-14; v0.2.1 of the code implements v0.3).
> v0.4 folds in the decisions from the review on 2026-11-18 (D15–D22 in §12). Changes from v0.3 are mainly in §3, §4, §6, §7, §8.1, §9.

## 1. What this is

A lightweight, personal agentic harness for building software — and **Quan's foundation for every repo he builds**.

- **Quan is the manager / tech lead.** He decides *what*, defines inputs and outputs, and approves at gates.
- **Agents (Claude Code) decide *how* and execute.**
- **Positioning:** less documentation, more control during execution. Reliability over speed.

The harness does **not** invent new agent machinery. It **curates** existing skills, templates and tools, copies them into one repo, and wires them into one explicit workflow that Quan understands and can override piece by piece.

**Plan of use:** build it, validate it on the habit-tracker dogfood, then run every other repo on top of it.

## 2. Principles

1. **Personal standard.** Built for Quan's workflow. Public as a reference; no promise to support other people's workflows.
2. **Curate, don't invent.** Borrow first. Write our own only where a borrowed piece clearly hurts.
3. **Gears with contracts.** Each gear (workflow step) does one job and declares its trigger, input, output, gate, stop conditions and the components it uses.
4. **Design for deletion.** When models or Claude Code cover a gear, delete the gear. Delete gears; never add toggles.
5. **Docs are required, but minimal.** The spec is the source of truth. As long as the spec exists, the system can be rebuilt.
6. **Humans at gates, not everywhere.** The agent stops and asks when uncertain. A few questions go straight to chat; a long list goes into the doc (§4.7).
7. **Reliability over speed.** Measured by how often the harness gets things wrong and where it gets stuck (§8).
8. **Separation.** The harness lives in its own repo. Projects use it, never change it.
9. **One of each.** Exactly one component per job across the whole machine. If the harness has a grill skill, no other grill skill is installed.
10. **Code follows docs.** Docs change first; code is derived from them. Docs and code of a feature travel together on one branch.
11. **The harness is the whole package.** Every skill, command, hook, agent and MCP server Quan's projects use comes from the harness. Nothing workflow-related is installed on the machine outside it.
12. **Quan understands every piece.** The harness is only useful if Quan can explain what each step and each file does. Work moves one small step at a time: explain the step, wait for Quan to follow it, then build. Every version updates `docs/walkthrough.md` (a guided tour in Vietnamese) together with the code; a change Quan can't explain back is not done.

## 3. Architecture

### 3.1 Three layers

```
Layer 1: UPSTREAM        mattpocock-skills, superpowers, Spec Kit, EARS, Anthropic's official plugins, ...
            │  Quan picks pieces; they are copied in and recorded in SOURCES.md
            ▼
Layer 2: HARNESS         this repo — the ONLY Claude Code plugin Quan installs
            │  every skill, command, hook and MCP server his projects use lives here
            ▼
Layer 3: PROJECTS        real repos — code, docs/, a small CLAUDE.md, and project-only extras
```

- **Upstream is a shop, not an install.** Nothing from layer 1 is installed on the machine. `upstream-diff` shows what changed upstream; Quan decides what to take.
- **Packaging:** the harness repo is a **Claude Code plugin** and its own one-plugin marketplace. Like a VS Code extension: installed once, Claude Code keeps one copy in its plugin cache, every session in every repo loads that copy.
- **Change propagation:** edit the harness → merge → `claude plugin update harness@harness` → every project uses the new version. Projects hold no copies. Versions are git tags, so a change can be rolled back.
- **Separation (principle 8):** Claude Code runs the plugin from its cache, outside the project, so an agent working in a project cannot change the harness.
- **Project-only extras:** a project may add its own skills or rules in its `.claude/` and `CLAUDE.md` when they only make sense there. They may add to the harness, never replace a harness component.

### 3.2 What lives where

| Place | Holds |
|---|---|
| **Harness** (this repo) | All workflow: skills, commands, hooks, agents, templates, scripts, MCP server declarations |
| **`~/.claude`** (the machine) | Only what belongs to the machine and the person: sign-in, permissions, model choice, personal preferences (language, tone), and the line that enables the harness plugin |
| **Project repo** | Code, `docs/`, `harness.json`, project `CLAUDE.md`, project-only extras |

How a piece gets into the harness depends on its kind:

| Kind | How |
|---|---|
| Skill, command, hook, agent, template (text or script files) | **Copied** into the repo; license and changes recorded in `SOURCES.md` |
| MCP server (an external program, e.g. Playwright) | **Declared** in the plugin's `.mcp.json`. It can't be copied, so this is the one exception to "copy, don't depend" |
| Built-in Claude Code feature (e.g. `/code-review`, `/simplify`) | Can't be removed. The harness adds no duplicate; where it needs a better version (e.g. a spec-aware review), its gear names that version explicitly |

### 3.3 Gears and components

The harness has two concepts. A gear is a **step**; a component is a **thing** Claude Code can load.

| | Gear | Component |
|---|---|---|
| What | One step of the workflow: `/next`, Grill, Spec, Execute, PR, Feedback | One concrete artifact |
| Kinds | One kind | **skill**, **command**, **hook**, **agent** (subagent), **template**, **script**, **MCP server** |
| Defined by | A contract `gears/<name>.md` (§5) | The file itself, plus a `SOURCES.md` line if borrowed |
| Relation | Assembled from one or more components | May be shared by several gears, or used on its own outside any gear |

Which gear uses which components:

| Gear | Components |
|---|---|
| `/next` | command `next`, scripts `next-state`, `init-project` |
| G1 Grill | skill `grill` (from `grilling`) + template `grill.md`; skill `prototype` when a question is best answered by something visible |
| G2 Spec | skill `spec` + template `spec.md` (Spec Kit + EARS) + script `check-spec` |
| G3 Execute | skill `execute` + skill `tdd` + hook `verify` |
| G4 PR | skill `pr` + skill `code-review` (self-review against the spec) + template `pr.md` |
| G5 Feedback | skill `feedback` + script `pr-feedback` |
| *(on demand)* | skills `diagnosing-bugs`, `domain-modeling`, `codebase-design`, `find-docs`, `frontend-design`, `writing-for-agents`; MCP server `playwright`; safety hooks |

Rules that follow:

- **Contracts apply to gears:** no step exists without a contract.
- **"One of each" applies to components:** one grill skill, one review skill, one docs-lookup skill on the whole machine.
- **Deleting:** delete a gear by deleting its contract; then delete any component no gear or on-demand use still needs.
- The table above is the starting point; the contracts in `gears/` are the source of truth once built.

## 4. Workflow

### 4.1 The big picture

The unit of work is a **feature**: one branch, one PR, docs and code together.

```
master ─────────────────────────────────────────────────────────●  merge = feature done
        \                                                       /
feature/001-streaks:  grill.md ─ spec.md ─ T1 ─ T2 ─ T3 ─ (fixes)
                                    ▲                          ▲
                             Gate A: draft PR,           Gate B: PR ready,
                             Quan reviews the spec       Quan reviews, gives fit score, merges
```

```
Idea
 → [G1 Grill]    branch feature/<NNN-slug>; agent interviews Quan        → grill.md
 → [G2 Spec]     agent writes spec + tasks; opens a DRAFT PR to master    → spec.md
 → ⛔ Gate A      Quan reviews the spec on the draft PR and approves
 → [G3 Execute]  one task = one commit on the same branch, repeated per task
 → [G4 PR]       agent self-reviews the branch against the spec, marks the PR ready
 → ⛔ Gate B      Quan reviews, comments the fit score, merges
 → [G5 Feedback] whenever Quan comments on the PR (at Gate A, Gate B, or in between)
```

### 4.2 How Quan drives it: `/next` and `/next auto`

Quan never has to remember which gear comes next. `/next` is the dispatcher gear: it reads the state of the repo and GitHub and calls the one gear that is due.

| Command | What happens | Use it when |
|---|---|---|
| **`/next <idea>`** | Starts a new feature (new branch, G1 Grill). Always allowed, even while other features are open | You have a new idea |
| **`/next`** | Runs **one** step, then stops and says what comes next | You want to watch each step |
| **`/next auto`** | Keeps running steps until something needs Quan: a gate, a question, or a stop condition. Never merges, never skips a gate | You want to hand over and come back later |

Example: after Gate A on a spec with tasks T1–T3, `/next` builds T1 and stops; `/next auto` builds T1, T2, T3, self-reviews, marks the PR ready, and stops at Gate B.

**Several features can be open at once**, each on its own branch. `/next` first works out each open feature's own state:

| State of one feature | Its step | Kind |
|---|---|---|
| A comment on its PR has no `[harness]` reply after it | **G5 Feedback** | work |
| Spec approved, an unchecked task is ready | **G3 Execute** that task | work |
| All tasks checked, PR still draft — or ready but in conflict with `master` | **G4 PR** (rebase first) | work |
| Grill done, no spec (or no draft PR yet) | **G2 Spec** | work |
| A `> QUESTION` block is open in its docs | **question** — remind Quan | needs Quan |
| Grill missing or not `Status: done` | **G1 Grill** — continue the interview | needs Quan |
| Spec drafted, not approved | **⛔ Gate A** — point Quan to the draft PR | needs Quan |
| PR ready for review | **⛔ Gate B** — point Quan to the PR, ask for the fit score | needs Quan |

Then it picks: **work before anything that needs Quan**, and within each kind the order of the table, oldest feature first. So `/next auto` finishes every piece of work it can do alone, and only then stops with the list of everything waiting for Quan. With no open feature it asks for the next idea; outside a harness project (no `harness.json`) it offers to run `init-project`. If GitHub can't be read, it stops with `blocked` instead of guessing from half the state.

`/next` switches to the right feature branch itself (pulling it first) before running a step.

### 4.3 Gears

| Gear | Triggered when | Input | Output | Stops when |
|---|---|---|---|---|
| G1 Grill | `/next <idea>`, or an open feature's grill is unfinished | Idea (free text), `docs/product.md`, `docs/decisions.md` | Branch `feature/<NNN-slug>` with `grill.md`: rounds, decisions, open questions | Quan says the idea is clear enough → `Status: done` |
| G2 Spec | Grill done, no spec | `grill.md`, `docs/product.md`, the codebase | `spec.md` (problem, scope, non-goals, EARS acceptance criteria, test seams, decisions, task list) committed on the branch; a **draft PR** to `master` | Spec passes `check-spec`, draft PR opened → Gate A |
| G3 Execute | Spec approved, a task is ready | One task + spec | One commit `feat(Tn): ...` on the feature branch with code, tests, synced docs and the task's checkbox ticked; verify passes | Task done and verified, or a stop condition hits |
| G4 PR | All tasks checked, PR still draft | The feature branch, the spec | Self-review with `code-review` (standards + spec) and fixes; PR body filled from `pr.md`; PR marked ready for review | PR ready → Gate B |
| G5 Feedback | A comment on the feature PR has no `[harness]` reply after it | The comments | Docs first, then code; verify; pushed to the same branch; one `docs/interventions.md` line per comment; one `[harness]` reply | Docs, tasks and code consistent again |

### 4.4 Gates

- **Gate A — approve the spec.** The spec is on the draft PR, so Quan reads it on GitHub and can comment on any line; G5 applies the comments. To approve, Quan says "approved" in chat or comments "approved" on the PR; the agent records `Status: approved` in the spec and pushes. (GitHub's own "Approve" button is not available: the agent works through Quan's GitHub account, so Quan is the PR's author, and authors cannot approve their own PRs.) Quan never has to edit the file himself.
- **A comment counts as handled** once a `[harness]` reply is posted after it. G5 always ends with such a reply, so pushing task commits never hides an unanswered comment.
- **Gate B — accept the feature.** Quan reviews the ready PR (GitHub's "changes since last review" helps), comments if needed (G5 applies), writes the fit score as a comment (`Fit: 4 — <one sentence>`), and merges. The agent records the fit score in the spec before the merge. **Merging is the only way a feature reaches `master`, and only Quan merges.**

### 4.5 Docs in a project, and keeping them in sync with code

```
docs/
  product.md               # the CURRENT truth about the system (living doc)
  decisions.md             # project-wide decision log, append-only
  interventions.md         # intervention log for this project (§8)
  features/
    001-streaks/
      grill.md
      spec.md              # scope, acceptance, test seams, task list, fit score
```

- Feature specs are **history**; `product.md` is **the present**. The last task of every feature updates `product.md`.
- Decisions that outlive a feature go into `decisions.md`; feature-local decisions stay in that feature's `spec.md`.
- **Everything reaches `master` through the feature PR** — grill, spec, code, docs, fit score together. No docs are committed straight to `master`.
- **Spec first:** when a comment changes *what* the feature should do (a criterion, the scope, a decision), G5 edits the spec first and then the code, in the same PR. When it only changes *how* (code within the spec), the spec stays as it is.
- Automatic semantic doc/code checks are out of scope for now.

### 4.6 Tasks and their state

- Tasks live in the feature's `spec.md` as checkboxes: `- [ ] T3: <title> (covers: A2, A5) (after: T1)`.
- G3 ticks the task (`- [x]`) in the same commit as its code, so **a task is done when its commit is on the feature branch**, and the feature is done when its PR is merged.
- Tasks run in order of their dependencies; `/next auto` runs them one after another without waiting for Quan.
- A feature is closed when its PR is merged; the fit score is in its spec.

### 4.7 Stop-and-ask rule

The agent must stop and ask when:

- a requirement is ambiguous or missing from the spec;
- a change would touch files outside the task's scope;
- a change would contradict a recorded decision;
- tests cannot pass without changing an acceptance criterion;
- verification (the Stop hook, §7) fails three times in a row on the same task.

**How to ask:**

- **Up to ~3 questions:** ask in chat, each with options and the agent's recommended default.
- **A longer list:** write them into the doc, directly under the section they concern, then tell Quan in chat where they are. Quan may answer in chat ("T3: B"); the agent folds every answer into the doc and removes the `> QUESTION` block.

```markdown
> QUESTION (task T3): Should a missed day reset the streak to 0 or pause it?
> Options: A) reset  B) pause — default: A
```

### 4.8 Grill rounds

- Each round asks at most **5 questions** so Quan can answer quickly. There is **no limit on rounds**: a vague idea simply takes more rounds, and a vague question is split into smaller ones in later rounds.
- When a question is about how something should look or behave, the agent may build a throwaway prototype (`prototype` skill) instead of asking in words.

### 4.9 Example: one feature, end to end

1. `/next I want a habit tracker` → branch `feature/001-habit-tracker`; the agent grills Quan (G1) until he says "clear enough".
2. `/next` → the agent writes the spec with tasks T1–T3 (G2), opens a draft PR and stops at Gate A.
3. Quan comments on two lines of the spec; `/next` applies them (G5). Quan approves.
4. `/next auto` → T1, T2, T3 as three commits (G3), self-review (G4), PR marked ready; stops at Gate B. Meanwhile Quan can start `/next export to CSV` as a second feature.
5. Quan reviews, leaves one comment and `Fit: 4 — ...`; `/next` applies the comment (G5) and records the fit score. Quan merges.

## 5. Gear contract

Each gear is one file, `gears/<name>.md`:

```markdown
# Gear: <name>
- Purpose: <one line>
- Triggered when: <the project state that makes /next pick this gear>
- Input: <artifact>
- Output: <artifact>
- Gate: <none | Gate A | Gate B>
- Stop conditions: <list>
- Components: <skill/command/hook/agent/template/script paths this gear uses>
- Delete when: <the condition under which this gear is no longer needed>
```

No gear exists without a contract. Where each borrowed component came from is recorded once, in `SOURCES.md`, not in the contract.

## 6. Sourcing policy

- **Copy, don't depend.** Copy the borrowed piece into the harness so it can be overridden freely. Keep the upstream license. (Exception: MCP servers are declared, §3.2.)
- **Record everything** in `SOURCES.md`: `component | upstream URL (path) | version/commit | license | local changes`.
- **Check the license first.** No license → don't copy.
- **Take the smallest piece.** One template or one skill, never a whole framework.
- **One of each.** Before adding a component, check nothing in the harness already does that job.
- **Pull upstream on purpose.** Use `upstream-diff`; never auto-update.

| Source | What the harness takes | Status |
|---|---|---|
| mattpocock-skills 1.3.1 (MIT) | `grilling` (G1); `tdd`, `diagnosing-bugs`, `domain-modeling`, `codebase-design`; PR template structure | In v0.2 |
| mattpocock-skills 1.3.1 (MIT) | `code-review` (G4 self-review), `prototype` (G1), `writing-for-agents` (editing the harness itself) | **v0.3** |
| GitHub Spec Kit (MIT) | Spec template structure | In v0.2 |
| EARS requirement syntax | Acceptance criteria format | In v0.2 |
| Superpowers 7.0.2 (MIT) | Only the "evidence before claims" rule from `verification-before-completion` (G3). Not its TDD | In v0.2 |
| Anthropic official plugins (Apache-2.0) | `frontend-design` skill; `find-docs` skill (docs lookup via the `ctx7` CLI); Playwright MCP server (declared) | **v0.3** |
| karanb192/claude-code-hooks (MIT) | Safety hooks `block-dangerous-commands`, `protect-secrets`, `case-insensitive-guard` | **v0.3** |
| mattpocock-skills issue-tracker flow (`to-tickets`, `triage`, `wayfinder`) | Tasks as issues instead of spec checkboxes | **Later** — Quan likes it; adopt after the basic workflow is validated on the dogfood |
| BMAD-METHOD (MIT) | Story-file idea for task context | Later, if the log shows missing-context pain |
| Plannotator (Apache-2.0) | Review aid for Gate A and Gate B | Later, if Gate B reviews get heavy |
| Vibe Kanban (Apache-2.0) | Board | Later |

## 7. Repo layout

```
harness/
  .claude-plugin/        # plugin + marketplace manifests
  .mcp.json              # MCP servers the harness provides (Playwright)
  CLAUDE.md              # how agents work in this repo; points to docs/spec.md
  AGENTS.md              # one line: see CLAUDE.md
  docs/
    spec.md              # this document
    walkthrough.md       # guided tour for Quan (Vietnamese), updated every version
    reports/             # build and review reports
  gears/                 # contracts only: next.md, grill.md, spec.md, execute.md, pr.md, feedback.md
  # components, organised by kind (the standard Claude Code plugin layout):
  skills/                # grill/, spec/, execute/, pr/, feedback/, tdd/, code-review/, prototype/, ...
  commands/              # next.md
  hooks/                 # hooks.json, verify.mjs, safety hooks
  agents/                # empty until a gear needs a subagent
  templates/             # grill.md, spec.md, pr.md, project scaffold files
  scripts/               # next-state, init-project, new-feature, check-spec, pr-feedback, selftest, upstream-diff, collect-logs
  test/                  # node:test suites, including an end-to-end flow
  SOURCES.md
  vendor-licenses/
  benchmarks/            # one file per run, records the harness version (git tag)
```

**What `scripts/init-project` creates in a project** (nothing else — everything else comes from the plugin):

| In the project | What it is |
|---|---|
| `CLAUDE.md` | Small project rules file; points to `docs/product.md` and the open features |
| `harness.json` | Project settings the harness needs, starting with the verify command (e.g. `{ "verify": "npm test" }`) |
| `docs/` | `product.md`, `decisions.md`, `interventions.md`, empty `features/` |

**Stop hook (verify):** ships in the plugin. It runs the project's `verify` command from `harness.json` when code changed; in a repo without `harness.json` it does nothing. After three failures in a row it lets the agent stop and tells Quan.

**Safety hooks:** ship in the plugin and apply in every repo: block dangerous shell commands, block reading or leaking secrets, block file names that differ only by case.

Machine prerequisites (not vendored): Claude Code, git, gh, Node.

## 8. Measurement

### 8.1 Feedback channels

The agent logs every intervention, so Quan never has to remember to:

1. **In chat during a run:** when Quan corrects, redirects or unblocks the agent, it drafts a log line; Quan confirms or edits it.
2. **PR comments (Gate A, Gate B, in between):** G5 logs each comment as a line.
3. **Fit score at Gate B:** Quan comments `Fit: N — <one sentence>` on the feature PR.

**Fit score** answers: "did I get what I wanted, for the effort I put in?" It catches what the error rate misses (zero interventions but the wrong product).

| Score | Meaning |
|---|---|
| 5 | Exactly what I wanted, I barely touched it |
| 3 | Got there, but with a lot of correcting |
| 1 | Faster to do it myself |

Read it as a trend over several features, never one. If after a few features it says nothing the other metrics don't, delete it.

### 8.2 Intervention log

Lives in the project at `docs/interventions.md` (projects never write into the harness). `scripts/collect-logs` gathers logs into the harness's `benchmarks/`.

```
date | feature | task | gear | type | what happened | what I wished the system had done
```

Types are split by **whose fault it was**:

| Type | Meaning | Harness fault? |
|---|---|---|
| `agent-mistake` | Agent got it wrong although the spec was clear | yes |
| `missing-context` | Agent lacked information it should have had | yes |
| `spec-gap` | Spec was vague or missing something (G1/G2 didn't dig deep enough) | yes |
| `manual-trigger` | Quan had to kick off something that should have run on its own | yes |
| `changed-mind` | Quan changed his mind | no |

Add new types when they appear.

### 8.3 Metrics

| Metric | Definition | Tells us |
|---|---|---|
| **Error rate** (headline) | harness-fault interventions ÷ all interventions | How often the harness gets it wrong |
| **Bottleneck** | harness-fault interventions per gear and per type | Which gear to fix first |
| **First-pass merge** | Feature PRs merged with no comment after Gate A ÷ all feature PRs | Execution quality |
| **Rework** | G5 rounds per feature PR | Cost of mistakes |
| **Fit score** | Quan's 1–5 per feature | Overall satisfaction |
| Active time | Estimated later from session transcripts | Secondary; not tracked by hand |

### 8.4 Benchmarks

| | Greenfield run | Replay set |
|---|---|---|
| Measures | Speed and fit, from empty repo to running app | Whether a gear change reduces harness-fault interventions |
| Starts from | The same frozen, approved spec | Tagged commits |
| When | At major harness milestones | After every gear change |

Each run records the harness version (git tag). Greenfield runs are not reproducible exactly; compare trends over several runs, never a single run.

## 9. Milestones

**v0.1: Skeleton** — done (2026-11-15). **v0.2: Close the loop** — done; a live agent ran one feature end to end in `harness-sandbox` (v0.2.1).

**v0.3: Workflow v2 + the whole package**
- Feature branch + one feature PR (§4.1); spec on a draft PR at Gate A; several open features; `/next` picks across features (§4.2); fit score at Gate B.
- G4 becomes "self-review and mark ready" with Matt's `code-review`; G1 may use `prototype`.
- Bring in `find-docs`, `frontend-design`, `writing-for-agents`, the three safety hooks, and the Playwright MCP server (§6).
- Update selftest, the end-to-end test and a live smoke run in `harness-sandbox` for the new flow.
- **Exit criteria:** in `harness-sandbox`, a live agent takes one feature through grill → spec on a draft PR → approval → `/next auto` → ready PR → a comment applied → merge with fit score, while a second feature is open.

**v0.4: Machine cleanup**
- Remove from the machine everything the harness now provides or that duplicates a built-in (list in §9.1). The global `~/.claude/CLAUDE.md` shrinks to personal preferences.
- Every change to `~/.claude` is listed first and approved by Quan item by item. Nothing is changed before that review.
- **Exit criteria:** a fresh Claude Code session in any repo loads only the harness for workflow jobs (one of each).

**Then: dogfood.** Greenfield baseline run on the habit tracker, with Quan driving.

**After validation:** the harness becomes the base for all of Quan's other repos.

**Later, only when the intervention log shows real pain:** Matt's issue-tracker flow · kanban board · contracts for special task types (data migration, UI, architecture decisions) · eval and guardrails · decision-first review view · subagents · memory · automatic doc/code sync checks · triggering `/next` automatically from new PR comments.

### 9.1 Machine cleanup list (for v0.4, not done yet)

| On the machine today | Action | Why |
|---|---|---|
| `mattpocock-skills` plugin | Uninstall | The skills Quan uses are in the harness |
| `superpowers`, `feature-dev`, `github` plugins (disabled) | Uninstall | Unused |
| `code-review` plugin | Uninstall | Duplicates built-in `/code-review`; the harness uses Matt's spec-aware one in G4 |
| `code-simplifier` plugin | Uninstall | Duplicates built-in `/simplify` |
| `context7` plugin + `~/.claude/rules/context7.md` + `~/.claude/skills/find-docs` | Uninstall / delete | Three docs-lookup tools; the harness carries `find-docs` |
| `frontend-design`, `playwright` plugins | Uninstall after the harness carries them | Now provided by the harness |
| `figma` plugin | Uninstall | Not used |
| 3 safety hook plugins | Uninstall after the harness carries them | Now provided by the harness |
| `auto-stage`, `git-safety`, `protect-tests`, `config-guard` (disabled) | Uninstall | Conflict with the workflow or block work on the harness; `protect-tests` may come back if the log shows weakened tests |
| `~/.claude/CLAUDE.md` | Cut to personal preferences | Workflow rules live in the harness |

## 10. Non-goals (v0.x)

- No UI.
- No unattended loop that merges or skips a gate. `/next auto` stops at every gate.
- No multi-user or corporate features.
- No support for other people's workflows.
- No custom agent runtime.
- No automatic upstream updates.

## 11. Rules for agents working in this repo

- Read `docs/spec.md` before doing anything.
- Do not add a gear without a contract in `gears/` and Quan's approval.
- Every borrowed file gets a `SOURCES.md` entry.
- One component per job: check for an existing one before adding.
- Prefer deleting over adding options.
- Ask questions as in §4.7: a few in chat, a long list in the doc.
- Keep changes small: one gear per PR.
- Never change `~/.claude` without Quan's item-by-item approval.
- Before building, explain the step in plain words and wait for Quan; after building, update `docs/walkthrough.md` (principle 12).

## 12. Decisions and open questions

| # | Decision | Date |
|---|---|---|
| D1 | The harness is a **Claude Code plugin**, installed once and enabled machine-wide. Projects hold no copies. | 2026-11-14 |
| D2 | G1 starts from Matt's grill skill (mattpocock-skills 1.3.1, MIT). | 2026-11-14 |
| D3 | One entry command, **`/next`**, picks the gear from project state. | 2026-11-14 |
| D4 | ~~Task state ticked by the task's own PR~~ — superseded by D16. | 2026-11-14 |
| D5 | Docs are per **feature** (`docs/features/<NNN-slug>/grill.md`, `spec.md`), plus living `product.md` and append-only `decisions.md`. | 2026-11-14 |
| D6 | `/next auto` is opt-in; it never merges and never skips a gate. | 2026-11-14 |
| D7 | The plugin's Stop hook runs the project's verify command from `harness.json`. | 2026-11-14 |
| D8 | The agent drafts intervention-log lines from chat and PR comments; Quan confirms. | 2026-11-14 |
| D9 | Questions: a few in chat, a long list in the doc. | 2026-11-14 |
| D10 | Decision-first review view: not now; revisit Plannotator if Gate B reviews get heavy. | 2026-11-14 |
| D11 | Intervention log lives in each project; the harness collects it. Types are split by whose fault it was; headline metric is error rate. | 2026-11-14 |
| D12 | Three layers: upstream → harness → projects. Upstream changes come in only through `upstream-diff` and Quan's choice. | 2026-11-14 |
| D13 | One component per job machine-wide. | 2026-11-14 |
| D14 | **Gear** = workflow step with a contract; **component** = skill, command, hook, agent, template, script or MCP server. Repo is organised by component kind; `gears/` holds only contracts. | 2026-11-14 |
| D15 | **One branch and one PR per feature** (`feature/<NNN-slug>`): grill, spec, every task commit and fixes travel together; nothing is committed straight to `master`. | 2026-11-18 |
| D16 | Gate A = review of the spec on the **draft** feature PR (approve on GitHub or "approved" in chat). Each task is one commit that ticks its checkbox. | 2026-11-18 |
| D17 | **Several features may be open at once**; `/next` picks the most urgent step across them (§4.2). Replaces "finish the open feature first". | 2026-11-18 |
| D18 | Fit score (5/3/1 scale, §8.1) is given as a comment at Gate B and recorded in the spec inside the feature PR. Reviewed after a few features; deleted if it adds nothing. | 2026-11-18 |
| D19 | G4 = self-review with Matt's `code-review` (standards + spec), then mark the PR ready. | 2026-11-18 |
| D20 | **The harness is the whole package** (principle 11): every workflow component and MCP server comes from it; `~/.claude` keeps only machine and personal settings (§3.2). | 2026-11-18 |
| D21 | Bring in `prototype`, `writing-for-agents`, `code-review` (Matt), `frontend-design`, `find-docs`, Playwright MCP and three safety hooks. Figma is not kept. | 2026-11-18 |
| D22 | Matt's issue-tracker flow is wanted, but only after the basic workflow is validated on the dogfood. | 2026-11-18 |
| D23 | Gate A approval is "approved" in chat or as a PR comment (GitHub's Approve is impossible on one's own PR). A PR comment is handled once a `[harness]` reply follows it. `/next` does all work it can before stopping for anything that needs Quan. | 2026-11-18 |
| D24 | Principle 12: Quan understands every piece. Smaller steps, explained first; each version ships with an updated `docs/walkthrough.md`. | 2026-11-18 |

Still open:

- Stop conditions beyond §4.7 — add as the intervention log shows them.
