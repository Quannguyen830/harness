import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInterventions, parseFitScores, summarize, prStats, report } from '../scripts/collect-logs.mjs';
import { parseSources } from '../scripts/upstream-diff.mjs';
import fs from 'node:fs';

const log = `| date | feature | task | gear | type | what | wish |
|---|---|---|---|---|---|---|
| 2026-11-20 | 001-streaks | T1 | execute | agent-mistake | wrong reset | follow A2 |
| 2026-11-20 | 001-streaks | T2 | spec | spec-gap | timezone unclear | ask in grill |
| 2026-11-21 | 001-streaks | T2 | execute | changed-mind | wants pause | - |
`;

test('parse and summarize interventions', () => {
  const rows = parseInterventions(log);
  assert.equal(rows.length, 3);
  const s = summarize(rows);
  assert.equal(s.faults, 2);
  assert.equal(Math.round(s.errorRate * 100), 67);
  assert.deepEqual(s.byGear, { execute: 1, spec: 1 });
});

test('fit scores from specs', () => {
  assert.deepEqual(parseFitScores([{ dir: '001-a', spec: 'x\nFit score: 4 — solid\n' }, { dir: '002-b', spec: 'none' }]),
    [{ feature: '001-a', score: 4, note: 'solid' }]);
});

test('PR stats: first-pass and rework', () => {
  const prs = [
    { headRefName: 'task/001-T1-a', reviews: [], comments: [] },
    { headRefName: 'task/001-T2-b', reviews: [{ state: 'CHANGES_REQUESTED', body: 'x', submittedAt: '2026-01-01' }], comments: [{ body: '[harness] done', createdAt: '2026-01-02' }] },
    { headRefName: 'feat/other', reviews: [], comments: [] },
  ];
  assert.deepEqual(prStats(prs), { merged: 2, firstPassRate: 0.5, avgRework: 0.5 });
});

test('report renders the headline numbers', () => {
  const md = report({ projects: [{ name: 'habits', rows: parseInterventions(log), fits: [{ feature: '001-a', score: 4 }] }], harnessVersion: 'v0.2.0', date: '2026-11-22' });
  assert.match(md, /Overall error rate:\*\* 67% \(2 of 3\)/);
  assert.match(md, /- execute: 1/);
  assert.match(md, /v0\.2\.0/);
});

test('every SOURCES.md row names a GitHub upstream path', () => {
  for (const r of parseSources(fs.readFileSync('SOURCES.md', 'utf8'))) {
    assert.ok(r.repo && r.upstreamPath, `${r.component} lacks repo (path) in SOURCES.md`);
  }
});
