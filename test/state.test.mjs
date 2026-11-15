import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, parseTasks, parseStatus } from '../scripts/lib/state.mjs';

const GRILL_DONE = '# Grill\nStatus: done\n';
const spec = (status, tasks) => `# Spec\n> Status: ${status}\n\n## Tasks\n${tasks.join('\n')}\n`;
const base = (over = {}) => ({
  harnessProject: true, idea: null, otherDocs: [], prs: [], branch: 'master', branchAhead: false, dirty: false,
  features: [], ...over,
});
const feature = (over = {}) => ({ dir: '001-streaks', grill: GRILL_DONE, spec: null, specOnMaster: null, ...over });

test('parseTasks reads ids, done state, deps', () => {
  const t = parseTasks('- [x] T1: Model (covers: A1)\n- [ ] T2: UI (covers: A2) (after: T1)\nnoise');
  assert.deepEqual(t, [
    { id: 'T1', done: true, title: 'Model', after: [] },
    { id: 'T2', done: false, title: 'UI', after: ['T1'] },
  ]);
});

test('parseStatus handles quoted and plain lines', () => {
  assert.equal(parseStatus('> Status: Approved'), 'approved');
  assert.equal(parseStatus('Status: done'), 'done');
  assert.equal(parseStatus('nothing'), null);
});

test('non-harness repo → init', () => {
  assert.equal(decide(base({ harnessProject: false })).step, 'init');
});

test('no features → idle; idea → grill', () => {
  assert.equal(decide(base()).step, 'idle');
  const r = decide(base({ idea: 'habit tracker' }));
  assert.equal(r.step, 'grill');
  assert.equal(r.idea, 'habit tracker');
});

test('idea while a feature is open → question', () => {
  assert.equal(decide(base({ idea: 'x', features: [feature({ grill: null })] })).step, 'question');
});

test('open QUESTION block wins', () => {
  const f = feature({ spec: spec('draft', []) + '\n> QUESTION (T1): reset or pause?\n' });
  assert.equal(decide(base({ features: [f] })).step, 'question');
});

test('grill not done → grill; done, no spec → spec; draft → gate-a', () => {
  assert.equal(decide(base({ features: [feature({ grill: '# Grill\nStatus: in-progress' })] })).step, 'grill');
  assert.equal(decide(base({ features: [feature()] })).step, 'spec');
  assert.equal(decide(base({ features: [feature({ spec: spec('draft', ['- [ ] T1: a']) })] })).step, 'gate-a');
});

test('approved spec → first ready task, respecting deps', () => {
  const s = spec('approved', ['- [ ] T1: a', '- [ ] T2: b (after: T1)']);
  const r = decide(base({ features: [feature({ spec: s, specOnMaster: s })] }));
  assert.equal(r.step, 'execute');
  assert.equal(r.task, 'T1');
});

test('task in flight is skipped; dependent task waits → gate-b', () => {
  const s = spec('approved', ['- [ ] T1: a', '- [ ] T2: b (after: T1)']);
  const prs = [{ number: 4, headRefName: 'task/001-T1-a', lastCommitAt: '2026-01-02', feedbackAt: null }];
  const r = decide(base({ prs, features: [feature({ spec: s, specOnMaster: s })] }));
  assert.equal(r.step, 'gate-b');
  assert.equal(r.prs[0].number, 4);
});

test('independent task runs while another is in flight', () => {
  const s = spec('approved', ['- [ ] T1: a', '- [ ] T2: b']);
  const prs = [{ number: 4, headRefName: 'task/001-T1-a', lastCommitAt: '2026-01-02', feedbackAt: null }];
  assert.equal(decide(base({ prs, features: [feature({ spec: s, specOnMaster: s })] })).task, 'T2');
});

test('feedback newer than last commit → feedback', () => {
  const s = spec('approved', ['- [ ] T1: a']);
  const prs = [{ number: 4, headRefName: 'task/001-T1-a', lastCommitAt: '2026-01-02T00:00:00Z', feedbackAt: '2026-01-03T00:00:00Z' }];
  assert.equal(decide(base({ prs, features: [feature({ spec: s, specOnMaster: s })] })).step, 'feedback');
});

test('feedback older than last commit is considered addressed', () => {
  const s = spec('approved', ['- [ ] T1: a']);
  const prs = [{ number: 4, headRefName: 'task/001-T1-a', lastCommitAt: '2026-01-03T00:00:00Z', feedbackAt: '2026-01-02T00:00:00Z' }];
  assert.equal(decide(base({ prs, features: [feature({ spec: s, specOnMaster: s })] })).step, 'gate-b');
});

test('on a task branch: unfinished → execute; ticked, committed → pr', () => {
  const master = spec('approved', ['- [ ] T1: a']);
  const ticked = spec('approved', ['- [x] T1: a']);
  const on = { branch: 'task/001-T1-a', branchAhead: true };
  assert.equal(decide(base({ ...on, features: [feature({ spec: master, specOnMaster: master })] })).step, 'execute');
  assert.equal(decide(base({ ...on, features: [feature({ spec: ticked, specOnMaster: master })] })).step, 'pr');
  assert.equal(decide(base({ ...on, dirty: true, features: [feature({ spec: ticked, specOnMaster: master })] })).step, 'execute');
});

test('all tasks checked → done until fit score recorded; newest open feature is current', () => {
  const allChecked = spec('approved', ['- [x] T1: a']);
  assert.equal(decide(base({ features: [feature({ spec: allChecked, specOnMaster: allChecked })] })).step, 'done');
  const doneSpec = `${allChecked}\nFit score: 4 — good\n`;
  assert.equal(decide(base({ features: [feature({ spec: doneSpec, specOnMaster: doneSpec })] })).step, 'idle');
  const r = decide(base({ features: [feature({ spec: doneSpec, specOnMaster: doneSpec }), feature({ dir: '002-export', grill: null })] }));
  assert.equal(r.step, 'grill');
  assert.equal(r.feature, '002-export');
});

import { feedbackItems, lastCommitAt } from '../scripts/lib/state.mjs';

test('feedbackItems merges sources, drops [harness] replies and bare approvals, sorts by time', () => {
  const pr = {
    reviews: [
      { state: 'APPROVED', body: '', submittedAt: '2026-01-05', author: { login: 'q' } },
      { state: 'CHANGES_REQUESTED', body: 'rename it', submittedAt: '2026-01-03', author: { login: 'q' } },
    ],
    comments: [
      { body: '[harness] addressed', createdAt: '2026-01-04' },
      { body: 'also docs', createdAt: '2026-01-02', author: { login: 'q' } },
    ],
    commits: [{ committedDate: '2026-01-01' }, { committedDate: '2026-01-02T12:00:00Z' }],
  };
  const inline = [{ body: 'off by one', created_at: '2026-01-06', user: { login: 'q' }, path: 'src/a.js', line: 3 }];
  const items = feedbackItems(pr, inline);
  assert.deepEqual(items.map((i) => i.kind), ['comment', 'review:CHANGES_REQUESTED', 'inline']);
  assert.equal(items[2].path, 'src/a.js');
  assert.equal(lastCommitAt(pr), '2026-01-02T12:00:00Z');
});

test('a squash-merged task branch is ignored and flagged for cleanup', () => {
  const master = spec('approved', ['- [x] T1: a', '- [ ] T2: b (after: T1)']);
  const r = decide(base({ branch: 'task/001-T1-a', branchAhead: true, features: [feature({ spec: master, specOnMaster: master })] }));
  assert.deepEqual([r.step, r.task], ['execute', 'T2']);
  assert.match(r.cleanup, /git checkout master/);
  const allDone = `${spec('approved', ['- [x] T1: a'])}`;
  assert.equal(decide(base({ branch: 'task/001-T1-a', branchAhead: true, features: [feature({ spec: allDone, specOnMaster: allDone })] })).step, 'done');
});
