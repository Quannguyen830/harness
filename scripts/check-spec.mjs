#!/usr/bin/env node
// Checks a feature spec is internally consistent before Gate A.
// Usage: node check-spec.mjs <path/to/spec.md>   — exits 1 with a list of problems.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStatus, parseTasks } from './lib/state.mjs';

const REQUIRED_SECTIONS = ['Problem', 'Scope', 'User stories', 'Acceptance criteria', 'Test seams', 'Decisions', 'Tasks'];

export function checkSpec(text) {
  const problems = [];
  for (const s of REQUIRED_SECTIONS) {
    if (!new RegExp(`^## ${s}\\s*$`, 'm').test(text)) problems.push(`missing section "## ${s}"`);
  }
  if (!parseStatus(text)) problems.push('missing "> Status:" line');
  if (/<(title|trigger|system|response|seam)>/.test(text)) problems.push('template placeholders left in (e.g. <title>)');

  const criteria = [...text.matchAll(/^- (A\d+)\b/gm)].map((m) => m[1]);
  if (!criteria.length) problems.push('no acceptance criteria (lines starting "- A1")');
  const dupA = criteria.filter((a, i) => criteria.indexOf(a) !== i);
  if (dupA.length) problems.push(`duplicate acceptance ids: ${[...new Set(dupA)].join(', ')}`);

  const tasks = parseTasks(text);
  if (!tasks.length) problems.push('no tasks (lines like "- [ ] T1: ...")');
  const ids = new Set(tasks.map((t) => t.id));
  if (ids.size !== tasks.length) problems.push('duplicate task ids');

  const covered = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- \[[ xX]\] (T\d+):.*\(covers:\s*([^)]*)\)/);
    if (!m) continue;
    const cov = m[2].split(/[,\s]+/).filter(Boolean);
    for (const a of cov) {
      if (!criteria.includes(a)) problems.push(`${m[1]} covers unknown ${a}`);
      covered.add(a);
    }
  }
  for (const t of tasks) {
    if (!text.match(new RegExp(`^- \\[[ xX]\\] ${t.id}:.*\\(covers:`, 'm'))) problems.push(`${t.id} covers no acceptance item`);
    for (const d of t.after) if (!ids.has(d)) problems.push(`${t.id} depends on unknown ${d}`);
  }
  for (const a of criteria) if (!covered.has(a)) problems.push(`${a} is covered by no task`);

  // dependency cycles
  const deps = Object.fromEntries(tasks.map((t) => [t.id, t.after]));
  const state = {};
  const visit = (id, trail) => {
    if (state[id] === 'done') return;
    if (state[id] === 'active') { problems.push(`dependency cycle: ${[...trail, id].join(' → ')}`); return; }
    state[id] = 'active';
    for (const d of deps[id] ?? []) if (deps[d]) visit(d, [...trail, id]);
    state[id] = 'done';
  };
  for (const t of tasks) visit(t.id, []);

  if (tasks.length && !/product\.md/i.test(text.split(/^## Tasks\s*$/m)[1] ?? '')) {
    problems.push('no task mentions docs/product.md (the last task should update it)');
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('usage: check-spec.mjs <spec.md>'); process.exit(2); }
  const problems = checkSpec(fs.readFileSync(file, 'utf8'));
  if (problems.length) {
    console.error(`check-spec: ${problems.length} problem(s) in ${file}`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(`check-spec: ok (${file})`);
}
