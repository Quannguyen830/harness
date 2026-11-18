import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, featureStep, parseTasks, parseStatus, feedbackItems, unanswered, lastHarnessReplyAt } from '../scripts/lib/state.mjs';

const GRILL_DONE = '# Grill\nStatus: done\n';
const spec = (status, tasks, extra = '') => `# Spec\n> Status: ${status}\n\n## Tasks\n${tasks.join('\n')}\n${extra}`;
const pr = (over = {}) => ({ number: 7, url: 'https://x/pull/7', isDraft: true, unansweredAt: null, ...over });
const feature = (over = {}) => ({ dir: '001-streaks', branch: 'feature/001-streaks', grill: GRILL_DONE, spec: null, pr: null, ...over });
const base = (over = {}) => ({ harnessProject: true, idea: null, otherDocs: [], features: [], staleBranch: null, ...over });

test('parseTasks reads ids, done state, deps', () => {
  assert.deepEqual(parseTasks('- [x] T1: Model (covers: A1)\n- [ ] T2: UI (covers: A2) (after: T1)\nnoise'), [
    { id: 'T1', done: true, title: 'Model', after: [] },
    { id: 'T2', done: false, title: 'UI', after: ['T1'] },
  ]);
});

test('parseStatus handles quoted and plain lines', () => {
  assert.equal(parseStatus('> Status: Approved'), 'approved');
  assert.equal(parseStatus('Status: done'), 'done');
  assert.equal(parseStatus('nothing'), null);
});

test('featureStep walks one feature through its life', () => {
  assert.equal(featureStep(feature({ grill: null })).step, 'grill');
  assert.equal(featureStep(feature({ grill: '# G\nStatus: in-progress' })).step, 'grill');
  assert.equal(featureStep(feature()).step, 'spec');
  assert.match(featureStep(feature({ spec: spec('draft', ['- [ ] T1: a']) })).reason, /no draft PR/);
  assert.equal(featureStep(feature({ spec: spec('draft', ['- [ ] T1: a']), pr: pr() })).step, 'gate-a');
  const s = featureStep(feature({ spec: spec('approved', ['- [x] T1: a', '- [ ] T2: b (after: T1)', '- [ ] T3: c (after: T2)']), pr: pr() }));
  assert.deepEqual([s.step, s.task], ['execute', 'T2']);
  assert.equal(featureStep(feature({ spec: spec('approved', ['- [x] T1: a']), pr: pr() })).step, 'pr');
  const b = featureStep(feature({ spec: spec('approved', ['- [x] T1: a']), pr: pr({ isDraft: false }) }));
  assert.equal(b.step, 'gate-b');
  assert.match(b.reason, /fit score/);
  assert.doesNotMatch(featureStep(feature({ spec: spec('approved', ['- [x] T1: a'], 'Fit score: 4 — ok\n'), pr: pr({ isDraft: false }) })).reason, /fit score/);
});

test('unanswered comment and open QUESTION', () => {
  assert.equal(featureStep(feature({ spec: spec('draft', ['- [ ] T1: a']), pr: pr({ unansweredAt: '2026-11-18' }) })).step, 'feedback');
  assert.equal(featureStep(feature({ spec: spec('draft', ['- [ ] T1: a'], '> QUESTION (T1): ?\n'), pr: pr() })).step, 'question');
});

test('decide: init, idea, idle', () => {
  assert.equal(decide(base({ harnessProject: false })).step, 'init');
  assert.equal(decide(base()).step, 'idle');
  const r = decide(base({ idea: 'export', features: [feature({ grill: null })] }));
  assert.deepEqual([r.step, r.idea], ['grill', 'export'], 'a new idea is always allowed');
});

test('decide: work before needs-Quan, oldest feature first, waiting list', () => {
  const atGateA = feature({ dir: '001-a', branch: 'feature/001-a', spec: spec('draft', ['- [ ] T1: a']), pr: pr({ number: 1 }) });
  const working = feature({ dir: '002-b', branch: 'feature/002-b', spec: spec('approved', ['- [ ] T1: a']), pr: pr({ number: 2 }) });
  const grilling = feature({ dir: '003-c', branch: 'feature/003-c', grill: null });
  const r = decide(base({ features: [atGateA, working, grilling] }));
  assert.deepEqual([r.step, r.feature, r.task, r.kind], ['execute', '002-b', 'T1', 'work']);
  assert.deepEqual(r.waiting.map((w) => [w.step, w.feature]), [['grill', '003-c'], ['gate-a', '001-a']]);

  const r2 = decide(base({ features: [atGateA, grilling] }));
  assert.deepEqual([r2.step, r2.feature, r2.kind], ['grill', '003-c', 'needs-quan']);
});

test('decide: feedback outranks everything; stale branch adds cleanup', () => {
  const f1 = feature({ dir: '001-a', spec: spec('approved', ['- [ ] T1: a']), pr: pr({ number: 1 }) });
  const f2 = feature({ dir: '002-b', spec: spec('approved', ['- [x] T1: a']), pr: pr({ number: 2, isDraft: false, unansweredAt: '2026-11-18' }) });
  const r = decide(base({ features: [f1, f2], staleBranch: 'feature/000-old' }));
  assert.deepEqual([r.step, r.feature], ['feedback', '002-b']);
  assert.match(r.cleanup, /feature\/000-old/);
});

test('feedback helpers: harness replies close earlier comments', () => {
  const p = {
    reviews: [{ state: 'APPROVED', body: '', submittedAt: '2026-01-05' }, { state: 'COMMENTED', body: 'rename it', submittedAt: '2026-01-03' }],
    comments: [
      { body: 'approved', createdAt: '2026-01-01' },
      { body: '[harness] Spec approved.', createdAt: '2026-01-02' },
      { body: 'Fit: 4 — good', createdAt: '2026-01-04' },
    ],
  };
  const inline = [{ body: 'off by one', created_at: '2026-01-06', user: { login: 'q' }, path: 'src/a.js', line: 3 }];
  assert.deepEqual(feedbackItems(p, inline).map((i) => i.kind), ['comment', 'review:COMMENTED', 'comment', 'inline']);
  assert.equal(lastHarnessReplyAt(p, inline), '2026-01-02');
  assert.deepEqual(unanswered(p, inline).map((i) => i.body), ['rename it', 'Fit: 4 — good', 'off by one']);
});
