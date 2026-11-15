# Harness — Spec v0.3

> Status: approved by Quan on 2026-11-14. This is the source of truth for the harness repo.
> v0.3 folds in the decisions from the spec walkthrough on 2026-11-14 (see §12).

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
6. **Humans at gates, not everywhere.** The agent stops and asks when uncertain. A few questions go straight to chat; a long list goes into the spec (see §4.5).
7. **Reliability over speed.** Measured by how often the harness gets things wrong and where it gets stuck (§8).
8. **Separation.** The harness lives in its own repo. Projects use it, never change it.
9. **One of each.** Exactly one component per job across the whole machine. If the harness has a grill skill, no other grill skill is installed.
10. **Code follows docs.** Docs change first; code is derived from them.

## 3. Architecture: three layers

```
Layer 1: UPSTREAM        mattpocock-skills, superpowers, Spec Kit, EARS, ...
            │  Quan picks pieces; they are copied in and recorded in SOURCES.md
            ▼
Layer 2: HARNESS         this repo — the ONLY Claude Code extension Quan installs
            │  every skill, command and hook he uses lives here
            ▼
Layer 3: PROJECTS        real repos — only code, docs/ and a small CLAUDE.md
```

- **Packaging:** the harness repo is a **Claude Code plugin** (it also serves as its own plugin marketplace). Quan installs it once, **enabled for the whole machine**. The exact plugin layout follows the current Claude Code plugin docs, verified at implementation time.
- **Change propagation:** edit the harness → update the plugin → every project uses the new version. Projects hold no copies.
- **Separation (principle 8):** Claude Code runs the plugin from its own cache, outside the project, so an agent working in a project cannot change the harness.
- **Upstream updates are never automatic.** A script in the harness compares each vendored piece with a newer upstream version and shows the diff; Quan decides whether to take it.
### 3.1 Gears and components

The harness has two concepts. A gear is a **step**; a component is a **thing** Claude Code can load.

| | Gear | Component |
|---|---|---|
| What | One step of the workflow: `/next`, Grill, Spec, Execute, PR, Feedback | One concrete artifact |
| Kinds | One kind | **skill**, **command**, **hook**, **agent** (subagent), **template**, **script** |
| Defined by | A contract `gears/<name>.md` (§5) | The file itself, plus a `SOURCES.md` line if borrowed |
| Relation | Assembled from one or more components | May be shared by several gears, or used on its own outside any gear |

Which gear uses which components:

| Gear | Components |
|---|---|
| `/next` | command `next` |
| G1 Grill | skill `grill` (from `grill-me`) + template `grill.md` |
| G2 Spec | skill `spec` + template `spec.md` (Spec Kit + EARS) |
| G3 Execute | skill `execute` + skill `tdd` + hook `verify` |
| G4 PR | skill `pr` + template `pr.md` |
| G5 Feedback | skill `feedback` |
| *(no gear)* | skills `diagnosing-bugs`, `domain-modeling`, `codebase-design` — used on demand |

Rules that follow:

- **Contracts apply to gears:** no step exists without a contract.
- **"One of each" applies to components:** one grill skill on the whole machine.
- **Deleting:** delete a gear by deleting its contract; then delete any component no gear or on-demand use still needs.
- The table above is the starting point; the contracts in `gears/` are the source of truth once built.

## 4. Workflow

### 4.1 The big picture

The unit of work is a **feature**: one grill, one spec, several tasks, one PR per task.

```
Idea
 → [G1 Grill]      agent interviews Quan            → docs/features/<NNN-slug>/grill.md
 → [G2 Spec]       agent writes the spec + tasks    → docs/features/<NNN-slug>/spec.md
 → ⛔ Gate A        Quan approves the spec
 → [G3 Execute]    agent does ONE task on a branch  → code + tests (+ docs kept in sync)
 → [G4 PR]         agent opens a PR                 → PR on GitHub
 → ⛔ Gate B        Quan reviews and merges
 → [G5 Feedback]   agent applies review comments    → docs first, then code
 → back to G3 for the next task
```

### 4.2 How Quan drives it: one command, `/next`

Quan does not need to remember which gear comes next. In a project repo he types:

- **`/next <idea>`** — start a new feature (creates `docs/features/<NNN-slug>/` and runs G1).
- **`/next`** — the agent looks at the current feature's state, runs the one step that is due, and stops.
- **`/next auto`** (or "go autonomous") — the agent keeps running steps until it hits a gate or a stop condition. It never merges and never skips a gate.

The **current feature** is the newest folder in `docs/features/` that still has unchecked tasks or no approved spec. `/next` decides the step from files and GitHub, in this order (first match wins):

| # | State the agent sees | What `/next` does |
|---|---|---|
| 1 | A question to Quan is unanswered (in chat or as `> QUESTION` in a doc) | Stop and remind Quan |
| 2 | No current feature | Ask Quan for the next idea |
| 3 | `grill.md` missing or not marked `Status: done` | **G1 Grill** |
| 4 | Grill done, no `spec.md` | **G2 Spec** |
| 5 | Spec has `Status: draft` | **⛔ Gate A** — stop, ask Quan to review and set `Status: approved` |
| 6 | An open PR has unaddressed review comments | **G5 Feedback** |
| 7 | Current task branch has finished, verified work but no PR | **G4 PR** |
| 8 | An unchecked task exists that does not depend on an unmerged PR | **G3 Execute** that task |
| 9 | All remaining tasks wait on open PRs | **⛔ Gate B** — stop, list the PRs waiting for Quan |
| 10 | All tasks checked | Feature done — ask for the end-of-feature score (§8) and stop |

### 4.3 Gears

| Gear | Triggered when | Input | Output | Stops when |
|---|---|---|---|---|
| G1 Grill | Current feature has no finished grill | Idea (free text) | `grill.md`: questions, Quan's answers, open questions | Quan says the idea is clear enough → `Status: done` |
| G2 Spec | Grill done, no spec | `grill.md` + `docs/product.md` | `spec.md`: problem, scope, non-goals, acceptance checklist (EARS), decisions, task list (`Status: draft`) | Spec complete → Gate A |
| G3 Execute | Approved spec has a ready task | One task + spec | Code and tests on branch `task/<NNN>-<id>-<slug>`; the task's checkbox ticked in the same branch | Task done and verified, or a stop condition hits |
| G4 PR | Finished branch without a PR | Branch | PR against `master` linking the task, the acceptance items it covers, and a "docs in sync?" checklist | PR opened → Gate B |
| G5 Feedback | Open PR has review comments | Comments on the PR | Docs updated first, then code, pushed to the same PR; each comment logged (§8) | Docs, tasks and code are consistent again |

### 4.4 Docs in a project, and keeping them in sync with code

```
docs/
  product.md               # the CURRENT truth about the system (living doc)
  decisions.md             # project-wide decision log, append-only
  interventions.md         # intervention log for this project (§8)
  features/
    001-streaks/
      grill.md
      spec.md              # scope, acceptance, task list for this feature
```

- Feature specs are **history**; `product.md` is **the present**. The last task of every feature updates `product.md`.
- Decisions that outlive a feature go into `decisions.md`; feature-local decisions stay in that feature's `spec.md`.
- Sync rules: G5 changes docs before code; every PR names its task ID and acceptance items; the PR checklist asks "docs in sync?" and Quan checks it at Gate B. Automatic semantic doc/code checks are out of scope for now.

### 4.5 Tasks and their state

- Tasks live in the feature's `spec.md` as checkboxes: `- [ ] T3: <title> (covers: A2, A5) (after: T1)`.
- The task branch ticks its own checkbox (`- [x]`), so **a task is done exactly when its PR is merged** into `master`.
- "In progress" is not written anywhere; it is derived from open branches and PRs.
- In autonomous mode the agent picks the next task that does not depend on an unmerged PR and branches it from the latest `master`. It never stacks branches on unmerged PRs.

### 4.6 Stop-and-ask rule

The agent must stop and ask when:

- a requirement is ambiguous or missing from the spec;
- a change would touch files outside the task's scope;
- a change would contradict a recorded decision;
- tests cannot pass without changing an acceptance criterion;
- verification (the Stop hook, §7) fails three times in a row on the same task.

**How to ask:**

- **Up to ~3 questions:** ask in chat, each with options and the agent's recommended default.
- **A longer list:** write them into the doc, directly under the section they concern, then tell Quan in chat where they are:

```markdown
> QUESTION (task T3): Should a missed day reset the streak to 0 or pause it?
> Options: A) reset  B) pause — default: A
```

Answered questions are folded into the doc (as text or a decision), and the `> QUESTION` block is removed.

### 4.7 Example: one feature, end to end

1. Quan, in an empty repo: `/next I want a habit tracker`. The agent grills him (G1) until he says "clear enough".
2. `/next` → the agent writes `spec.md` with tasks T1–T5 (G2) and stops at Gate A.
3. Quan reads the spec, edits it, sets `Status: approved`.
4. `/next auto` → the agent does T1 (G3), opens a PR (G4), then T2 if it doesn't depend on T1, and so on, until every remaining task waits on a PR. It stops at Gate B with a list of PRs.
5. Quan reviews: merges one PR, leaves comments on another.
6. `/next` → the agent applies the comments (G5): docs first, then code, and logs each comment.

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

- **Copy, don't depend.** Copy the borrowed piece into the harness so it can be overridden freely. Keep the upstream license.
- **Record everything** in `SOURCES.md`: `name | upstream URL | version/commit | license | local changes`.
- **Check the license first.** No license → don't copy.
- **Take the smallest piece.** One template or one skill, never a whole framework.
- **One of each.** Before adding a skill, check nothing in the harness already does that job.
- **Pull upstream on purpose.** Use the upstream-diff script; never auto-update.

| Candidate | What to take | Status |
|---|---|---|
| mattpocock-skills 1.3.1 (MIT) | `grill-me` (G1); skills `tdd`, `diagnosing-bugs`, `domain-modeling`, `codebase-design` | **Use now** |
| GitHub Spec Kit (MIT) | Spec and task templates, the "constitution" idea | **Use now** — avoid its document volume |
| EARS requirement syntax (used by Kiro) | Acceptance criteria format | **Use now** — a format, not code |
| Superpowers 7.0.2 (MIT) | Plan execution, verification, finishing a branch | **Use now** — skill by skill; not its TDD (Matt's `tdd` covers that) |
| BMAD-METHOD (MIT) | Story-file idea for task context | Later, if the log shows missing-context pain |
| Plannotator (Apache-2.0) | Review aid for Gate A and Gate B | Later, if Gate B reviews get heavy |
| Vibe Kanban (Apache-2.0) | Board | Later |

## 7. Repo layout

```
harness/
  .claude-plugin/        # plugin + marketplace manifests (layout per Claude Code docs)
  CLAUDE.md              # how agents work in this repo; points to docs/spec.md
  AGENTS.md              # one line: see CLAUDE.md
  docs/
    spec.md              # this document
    decisions/           # short ADRs for the harness itself
  gears/                 # contracts only: next.md, grill.md, spec.md, execute.md, pr.md, feedback.md
  # components, organised by kind (the standard Claude Code plugin layout):
  skills/                # grill/, spec/, execute/, pr/, feedback/, tdd/, diagnosing-bugs/, ...
  commands/              # next.md
  hooks/                 # verify (Stop hook)
  agents/                # empty until a gear needs a subagent
  templates/             # grill.md, spec.md, pr.md, project scaffold files
  scripts/
    init-project         # scaffolds a project (see below)
    upstream-diff        # compares vendored pieces with upstream
    collect-logs         # pulls docs/interventions.md from projects into benchmarks/
  SOURCES.md
  benchmarks/            # one file per run, records the harness version (git tag)
```

**What `scripts/init-project` creates in a project** (nothing else — the skills come from the plugin):

| In the project | What it is |
|---|---|
| `CLAUDE.md` | Small project rules file; points to `docs/product.md` and the current feature |
| `harness.json` | Project settings the harness needs, starting with the verify command (e.g. `{ "verify": "npm test" }`) |
| `docs/` | `product.md`, `decisions.md`, `interventions.md`, empty `features/` |

**Stop hook:** ships in the plugin. It runs the project's `verify` command from `harness.json`; in a repo without `harness.json` it does nothing.

Machine prerequisites (not vendored): Claude Code, git, gh, Node.

## 8. Measurement

### 8.1 Feedback channels

The agent logs every intervention, so Quan never has to remember to:

1. **In chat during a run:** when Quan corrects, redirects or unblocks the agent, it drafts a log line; Quan confirms or edits it.
2. **PR comments at Gate B:** G5 logs each comment as a line.
3. **End of feature:** Quan gives a fit score 1–5 with one sentence.

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
| **Bottleneck** | interventions per gear and per type | Which gear to fix first |
| **First-pass merge** | PRs merged with no change request ÷ all PRs | Execution quality |
| **Rework** | G5 rounds per PR | Cost of mistakes |
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

**v0.1: Skeleton**
- Repo layout, plugin packaging, `CLAUDE.md`, gear contract template, `SOURCES.md`.
- `/next` dispatcher; G1, G2 and G3 assembled from borrowed components; on-demand skills vendored.
- Stop-and-ask rule; Stop hook; `scripts/init-project`.
- **Exit criteria:** in an empty repo, take an idea to an approved spec and execute one task.

**v0.2: Close the loop**
- G4, Gate B, G5, `/next auto`, intervention logging, `collect-logs`, `upstream-diff`.
- **Exit criteria:** one feature goes from spec to merged PR, and review feedback is reflected in the docs and the log.

**Checks for v0.1 and v0.2**
- `scripts/selftest` passes: every gear has a contract, every component a contract names exists, every borrowed component is in `SOURCES.md` with its license, no two components do the same job, manifests are valid.
- **Smoke run** in a throwaway private repo (`harness-sandbox`): an agent plays Quan with a tiny idea and drives `/next` through every gear. It checks the machinery, not the harness's quality, and is kept apart so the dogfood baseline starts clean.

**v0.3: Machine cleanup**
- The harness plugin is the only workflow extension on the machine; replaced plugins are disabled; the global `~/.claude/CLAUDE.md` is cut down to personal preferences (language, tone) and the workflow rules live in the harness.
- Every change to `~/.claude` is listed first and approved by Quan item by item. Nothing is changed before that review.
- **Exit criteria:** a fresh Claude Code session in any repo loads only the harness's skills for workflow jobs (one of each).

**Then: dogfood.** Greenfield baseline run on the habit tracker. Target: v0.1–v0.3 done in the first build session.

**After validation:** the harness becomes the base for all of Quan's other repos.

**Later, only when the intervention log shows real pain:** kanban board · contracts for special task types (data migration, UI, architecture decisions) · eval and guardrails · decision-first review view · subagents · memory · automatic doc/code sync checks.

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
- Ask questions as in §4.6: a few in chat, a long list in the doc.
- Keep changes small: one gear per PR.
- Never change `~/.claude` without Quan's item-by-item approval.

## 12. Decisions and open questions

Decided (walkthrough 2026-11-14):

| # | Decision |
|---|---|
| D1 | The harness is a **Claude Code plugin**, installed once and enabled machine-wide. Projects hold no copies. |
| D2 | G1 starts from **grill-me** in mattpocock-skills 1.3.1 (MIT). |
| D3 | One entry command, **`/next`**, picks the gear from project state. |
| D4 | Task state = checkboxes in the feature spec, ticked by the task's own PR. |
| D5 | Docs are per **feature** (`docs/features/<NNN-slug>/grill.md`, `spec.md`), plus living `product.md` and append-only `decisions.md`. |
| D6 | Autonomous mode (`/next auto`) is opt-in; it picks independent tasks only, never stacks branches, never merges. |
| D7 | The plugin's Stop hook runs the project's verify command from `harness.json`. |
| D8 | The agent drafts intervention-log lines from chat and PR comments; Quan confirms. |
| D9 | Questions: a few in chat, a long list in the doc. |
| D10 | Decision-first review view: not now; revisit Plannotator if Gate B reviews get heavy. |
| D11 | Intervention log lives in each project; the harness collects it. Types are split by whose fault it was; headline metric is error rate. |
| D12 | Three layers: upstream → harness → projects. Upstream changes come in only through `upstream-diff` and Quan's choice. |
| D13 | One component per job machine-wide; replaced plugins (e.g. `mattpocock-skills`) get disabled in v0.3. |
| D14 | **Gear** = workflow step with a contract; **component** = skill, command, hook, agent, template or script. Repo is organised by component kind; `gears/` holds only contracts. |

Still open:

- Stop conditions beyond §4.6 — add as the intervention log shows them.
