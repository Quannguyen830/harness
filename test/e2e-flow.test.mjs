// End-to-end walk through the deterministic layer of workflow v2 on a real git repo:
// one branch + one PR per feature, two features open at once, verify hook on task commits.
// GitHub is simulated by injecting PRs; the LLM steps are performed by the test itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { initProject } from '../scripts/init-project.mjs';
import { createFeature } from '../scripts/new-feature.mjs';
import { checkSpec } from '../scripts/check-spec.mjs';
import { collectFacts, decide } from '../scripts/lib/state.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const commitAll = (root, msg) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', msg); };
const templateDir = path.resolve('templates');
const hook = path.resolve('hooks/verify.mjs');
const fireHook = (cwd) => {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd }), encoding: 'utf8' });
  return r.stdout ? JSON.parse(r.stdout) : null;
};

const SPEC = `# Spec: Word count CLI

> Status: draft
> Feature: 001-word-count-cli · Grill: [grill.md](grill.md) · Created: 2026-11-18

## Problem
Quan wants to count words in a text file from the terminal.

## Scope
### In scope
Counting words in one file.
### Out of scope (non-goals)
Directories, stdin.

## User stories
### US1 — Count words (P1)
Run the CLI on a file and see the count.
Independent test: run it on a fixture file.

## Acceptance criteria
- A1 (US1): WHEN the CLI is given a file path, THE CLI SHALL print the number of whitespace-separated words.
- A2 (US1): IF the file does not exist, THEN THE CLI SHALL exit with code 1 and print an error.

## Test seams
- count(text) function: catches counting rules; misses argv handling.

## Decisions
- Words are split on any whitespace.

## Tasks
- [ ] T1: Count words in a file (covers: A1)
- [ ] T2: Error on a missing file and update docs/product.md (covers: A2) (after: T1)
`;

test('workflow v2 on a real repo: feature branch, draft PR, two features, merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'));
  git(root, 'init', '-q', '-b', 'master');
  git(root, 'config', 'user.email', 'e2e@test');
  git(root, 'config', 'user.name', 'e2e');
  write(root, 'package.json', JSON.stringify({ type: 'module', scripts: { test: 'node --test' } }));

  const prs = new Map(); // headRefName → simulated PR
  const state = (idea = null) => decide(collectFacts(root, { idea, github: () => [...prs.values()], fetch: false }));

  // init
  assert.equal(state().step, 'init');
  initProject(root, {});
  assert.equal(JSON.parse(read(root, 'harness.json')).verify, 'npm test');
  commitAll(root, 'chore: init harness project');
  assert.equal(state().step, 'idle');

  // G1: a new idea creates feature/001-... from master
  assert.equal(state('word count CLI').step, 'grill');
  const f1 = createFeature(root, 'Word count CLI', { templateDir, branch: true });
  assert.equal(f1.branch, 'feature/001-word-count-cli');
  assert.equal(git(root, 'branch', '--show-current'), f1.branch);
  assert.deepEqual([state().step, state().feature], ['grill', '001-word-count-cli']);
  write(root, `docs/features/${f1.dir}/grill.md`, read(root, `docs/features/${f1.dir}/grill.md`).replace('Status: in-progress', 'Status: done'));
  commitAll(root, 'docs(001): grill');

  // G2: spec on the branch; until the draft PR exists the step stays "spec"
  assert.equal(state().step, 'spec');
  const specPath = `docs/features/${f1.dir}/spec.md`;
  write(root, specPath, SPEC);
  assert.deepEqual(checkSpec(SPEC), []);
  commitAll(root, 'docs(001): spec');
  assert.match(state().reason, /no draft PR/);
  prs.set(f1.branch, { number: 1, url: 'u/1', headRefName: f1.branch, state: 'OPEN', isDraft: true, unansweredAt: null });
  assert.equal(state().step, 'gate-a');

  // a second idea while feature 1 waits at Gate A: allowed, numbered 002, branched from master
  assert.equal(state('export to CSV').step, 'grill');
  const f2 = createFeature(root, 'export to CSV', { templateDir, branch: true });
  assert.equal(f2.dir, '002-export-csv');
  assert.ok(!fs.existsSync(path.join(root, specPath)), 'feature 2 starts from master, without feature 1 docs');
  commitAll(root, 'docs(002): start grill');
  let s = state();
  assert.equal(s.kind, 'needs-quan');
  assert.deepEqual(s.waiting.map((w) => w.feature).sort(), ['001-word-count-cli', '002-export-csv'].filter((f) => f !== s.feature));

  // Gate A via a PR comment: unanswered → feedback (G5) outranks everything
  prs.get(f1.branch).unansweredAt = '2026-11-18T10:00:00Z';
  assert.deepEqual([state().step, state().feature], ['feedback', '001-word-count-cli']);
  git(root, 'checkout', '-q', f1.branch);
  write(root, specPath, read(root, specPath).replace('> Status: draft', '> Status: approved'));
  commitAll(root, 'docs(001): approve spec');
  prs.get(f1.branch).unansweredAt = null; // the [harness] reply was posted

  // G3: work beats needs-Quan; T1 then T2 as commits on the same branch
  s = state();
  assert.deepEqual([s.step, s.feature, s.task, s.kind], ['execute', '001-word-count-cli', 'T1', 'work']);
  assert.ok(s.waiting.some((w) => w.feature === '002-export-csv' && w.step === 'grill'));
  write(root, 'count.js', 'export const count = (t) => t.split(/\\s+/).filter(Boolean).length;\n');
  write(root, 'count.test.js', "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { count } from './count.js';\ntest('A1', () => assert.equal(count('a b  c'), 2));\n");
  const blocked = fireHook(root);
  assert.equal(blocked?.decision, 'block', 'verify hook blocks a failing test');
  write(root, 'count.test.js', read(root, 'count.test.js').replace('), 2)', '), 3)'));
  assert.equal(fireHook(root), null, 'green tests let the agent stop');
  write(root, specPath, read(root, specPath).replace('- [ ] T1:', '- [x] T1:'));
  commitAll(root, 'feat(001/T1): count words in a file');
  assert.deepEqual([state().step, state().task], ['execute', 'T2']);
  write(root, 'docs/product.md', '# Product\n\nA CLI that counts words in a file.\n');
  write(root, specPath, read(root, specPath).replace('- [ ] T2:', '- [x] T2:'));
  commitAll(root, 'feat(001/T2): error on missing file');

  // G4: all ticked, draft → pr; then ready → Gate B asking for the fit score
  assert.equal(state().step, 'pr');
  prs.get(f1.branch).isDraft = false;
  s = state();
  assert.deepEqual([s.step, s.feature], ['grill', '002-export-csv'], 'needs-Quan steps: grill ranks before gate-b');
  assert.ok(s.waiting.some((w) => w.step === 'gate-b' && /fit score/.test(w.reason)));

  // Fit score as a comment → feedback records it → Quan merges
  prs.get(f1.branch).unansweredAt = '2026-11-18T12:00:00Z';
  assert.equal(state().step, 'feedback');
  write(root, specPath, `${read(root, specPath)}\nFit score: 4 — smooth\n`);
  commitAll(root, 'docs(001): fit score');
  prs.get(f1.branch).unansweredAt = null;
  git(root, 'checkout', '-q', 'master');
  git(root, 'merge', '-q', '--no-ff', f1.branch, '-m', 'feat(001): word count CLI (#1)');
  prs.get(f1.branch).state = 'MERGED';

  // feature 1 is gone from the open list; standing on its branch triggers a cleanup hint
  git(root, 'checkout', '-q', f1.branch);
  s = state();
  assert.deepEqual([s.step, s.feature], ['grill', '002-export-csv']);
  assert.match(s.cleanup, /already merged/);
  assert.equal(s.waiting, undefined);
  assert.ok(read(root, 'docs/product.md').includes('counts words'));
});
