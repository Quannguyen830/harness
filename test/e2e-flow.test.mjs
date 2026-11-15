// End-to-end walk through the deterministic layer on a real git repo:
// init-project → /next states for every gear → verify hook on a task branch.
// GitHub is simulated by injecting open PRs; the LLM steps are performed by the test itself.
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
const hook = path.resolve('hooks/verify.mjs');
const fireHook = (cwd) => {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd }), encoding: 'utf8' });
  return r.stdout ? JSON.parse(r.stdout) : null;
};

const SPEC = `# Spec: Word count CLI

> Status: draft
> Feature: 001-word-count-cli · Grill: [grill.md](grill.md) · Created: 2026-11-15

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

test('full harness flow on a real repo', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'));
  git(root, 'init', '-q', '-b', 'master');
  git(root, 'config', 'user.email', 'e2e@test');
  git(root, 'config', 'user.name', 'e2e');
  write(root, 'package.json', JSON.stringify({ type: 'module', scripts: { test: 'node --test' } }));

  let prs = [];
  const state = (idea = null) => decide(collectFacts(root, { idea, github: () => prs }));

  // init
  assert.equal(state().step, 'init');
  const init = initProject(root, {});
  assert.equal(JSON.parse(read(root, 'harness.json')).verify, 'npm test');
  assert.ok(init.created.includes('CLAUDE.md'));
  commitAll(root, 'chore: init harness project');

  // idle → G1 grill
  assert.equal(state().step, 'idle');
  assert.equal(state('word count CLI').step, 'grill');
  const f = createFeature(root, 'Word count CLI', { templateDir: path.resolve('templates') });
  assert.equal(f.dir, '001-word-count-cli');
  assert.equal(state().step, 'grill', 'grill in progress stays on grill');
  assert.equal(state('another idea').step, 'question', 'a second idea is refused while a feature is open');
  write(root, `docs/features/${f.dir}/grill.md`, read(root, `docs/features/${f.dir}/grill.md`).replace('Status: in-progress', 'Status: done'));
  commitAll(root, `docs: grill ${f.dir}`);

  // G2 spec → Gate A
  assert.equal(state().step, 'spec');
  const specPath = `docs/features/${f.dir}/spec.md`;
  write(root, specPath, SPEC);
  assert.deepEqual(checkSpec(SPEC), []);
  commitAll(root, `docs: spec ${f.dir}`);
  assert.equal(state().step, 'gate-a');

  // a long question list blocks progress until answered
  write(root, specPath, `${SPEC}\n> QUESTION (task T2): exit code 1 or 2?\n`);
  assert.equal(state().step, 'question');
  write(root, specPath, SPEC.replace('> Status: draft', '> Status: approved'));
  commitAll(root, `docs: approve spec ${f.dir}`);

  // G3 execute T1 (T2 depends on T1)
  let s = state();
  assert.deepEqual([s.step, s.task], ['execute', 'T1']);
  git(root, 'checkout', '-q', '-b', 'task/001-T1-count-words');
  write(root, 'count.js', 'export const count = (t) => t.split(/\\s+/).filter(Boolean).length;\n');
  write(root, 'count.test.js', "import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { count } from './count.js';\ntest('A1', () => assert.equal(count('a b  c'), 2));\n");
  // verify hook blocks the deliberately wrong test
  const blocked = fireHook(root);
  assert.equal(blocked?.decision, 'block');
  assert.match(blocked.reason, /attempt 1\/3/);
  write(root, 'count.test.js', read(root, 'count.test.js').replace('), 2)', '), 3)'));
  assert.equal(fireHook(root), null, 'green tests let the agent stop');
  assert.equal(state().step, 'execute', 'unticked task keeps executing');
  write(root, specPath, read(root, specPath).replace('- [ ] T1:', '- [x] T1:'));
  commitAll(root, 'feat(T1): count words in a file');

  // G4 pr
  s = state();
  assert.deepEqual([s.step, s.task], ['pr', 'T1']);
  prs = [{ number: 1, title: 'feat(T1)', headRefName: 'task/001-T1-count-words', lastCommitAt: '2026-11-15T10:00:00Z', feedbackAt: null }];
  git(root, 'checkout', '-q', 'master');

  // T2 waits on T1 → Gate B
  assert.equal(state().step, 'gate-b');

  // G5 feedback: Quan comments after the last commit
  prs[0].feedbackAt = '2026-11-15T11:00:00Z';
  assert.equal(state().step, 'feedback');
  prs[0].lastCommitAt = '2026-11-15T12:00:00Z';
  assert.equal(state().step, 'gate-b', 'a newer commit marks feedback addressed');

  // Quan merges T1 → T2 becomes ready
  git(root, 'merge', '-q', '--no-ff', 'task/001-T1-count-words', '-m', 'Merge T1');
  prs = [];
  s = state();
  assert.deepEqual([s.step, s.task], ['execute', 'T2']);
  git(root, 'checkout', '-q', '-b', 'task/001-T2-missing-file');
  write(root, 'docs/product.md', '# Product\n\nA CLI that counts words in a file.\n');
  write(root, specPath, read(root, specPath).replace('- [ ] T2:', '- [x] T2:'));
  commitAll(root, 'feat(T2): error on missing file');
  assert.equal(state().step, 'pr');
  git(root, 'checkout', '-q', 'master');
  git(root, 'merge', '-q', '--no-ff', 'task/001-T2-missing-file', '-m', 'Merge T2');

  // all merged → done until the fit score is recorded → idle
  assert.equal(state().step, 'done');
  write(root, specPath, `${read(root, specPath)}\nFit score: 4 — smooth\n`);
  commitAll(root, `docs: close feature ${f.dir}`);
  assert.equal(state().step, 'idle');
  assert.equal(state('export to CSV').step, 'grill', 'next feature can start');
});
