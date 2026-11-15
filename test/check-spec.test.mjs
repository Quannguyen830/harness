import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkSpec } from '../scripts/check-spec.mjs';

const good = `# Spec: Streaks
> Status: draft

## Problem
p
## Scope
s
## User stories
u
## Acceptance criteria
- A1 (US1): WHEN a habit is ticked, THE app SHALL extend the streak.
- A2 (US1): IF a day is missed, THEN THE app SHALL reset the streak.
## Test seams
- CLI: catches all; misses nothing
## Decisions
## Tasks
- [ ] T1: Streak model (covers: A1)
- [ ] T2: Reset rule and update docs/product.md (covers: A2) (after: T1)
`;

test('a consistent spec passes', () => {
  assert.deepEqual(checkSpec(good), []);
});

test('the untouched template fails on placeholders', () => {
  const problems = checkSpec(fs.readFileSync('templates/spec.md', 'utf8'));
  assert.ok(problems.some((p) => p.includes('placeholders')));
});

test('uncovered criterion, unknown cover, unknown dep are reported', () => {
  const bad = good
    .replace('(covers: A2) (after: T1)', '(covers: A9) (after: T7)');
  const problems = checkSpec(bad);
  assert.ok(problems.includes('A2 is covered by no task'));
  assert.ok(problems.includes('T2 covers unknown A9'));
  assert.ok(problems.includes('T2 depends on unknown T7'));
});

test('cycles and missing sections are reported', () => {
  const cyc = good.replace('- [ ] T1: Streak model (covers: A1)', '- [ ] T1: Streak model (covers: A1) (after: T2)').replace('## Test seams\n', '');
  const problems = checkSpec(cyc);
  assert.ok(problems.some((p) => p.startsWith('dependency cycle')));
  assert.ok(problems.includes('missing section "## Test seams"'));
});

test('product.md must be updated by some task', () => {
  assert.ok(checkSpec(good.replace(' and update docs/product.md', '')).some((p) => p.includes('product.md')));
});
