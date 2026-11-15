import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { isDocPath, MAX_FAILURES } from '../hooks/verify.mjs';

const hook = path.resolve('hooks/verify.mjs');
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'ignore' });

function repo(verify) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hook-'));
  sh(dir, 'init', '-q', '-b', 'master');
  sh(dir, 'config', 'user.email', 't@t');
  sh(dir, 'config', 'user.name', 't');
  if (verify !== undefined) fs.writeFileSync(path.join(dir, 'harness.json'), JSON.stringify({ verify }));
  fs.writeFileSync(path.join(dir, 'README.md'), 'x');
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

const fire = (cwd) => {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, stop_hook_active: false }), encoding: 'utf8' });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null };
};

test('isDocPath', () => {
  assert.ok(isDocPath('docs/features/001-a/spec.md'));
  assert.ok(isDocPath('README.md'));
  assert.ok(!isDocPath('src/app.js'));
});

test('no harness.json → silent pass', () => {
  const dir = repo(undefined);
  fs.writeFileSync(path.join(dir, 'app.js'), '1');
  assert.deepEqual(fire(dir), { status: 0, out: null });
});

test('doc-only change → verify not run', () => {
  const dir = repo('node -e "process.exit(1)"');
  fs.writeFileSync(path.join(dir, 'docs.md'), 'notes');
  assert.deepEqual(fire(dir), { status: 0, out: null });
});

test('code change + passing verify → pass', () => {
  const dir = repo('node -e "process.exit(0)"');
  fs.writeFileSync(path.join(dir, 'app.js'), '1');
  assert.deepEqual(fire(dir), { status: 0, out: null });
});

test('code change + failing verify → block, then give up after MAX_FAILURES', () => {
  const dir = repo('node -e "console.log(\'boom\'); process.exit(1)"');
  fs.writeFileSync(path.join(dir, 'app.js'), '1');
  for (let i = 1; i < MAX_FAILURES; i++) {
    const r = fire(dir);
    assert.equal(r.out.decision, 'block');
    assert.match(r.out.reason, new RegExp(`attempt ${i}/${MAX_FAILURES}`));
    assert.match(r.out.reason, /boom/);
  }
  const last = fire(dir);
  assert.equal(last.out.decision, undefined);
  assert.match(last.out.systemMessage, /failed 3 times/);
  assert.equal(fire(dir).out.decision, 'block', 'counter resets after giving up');
});

test('clean tree: committed code on a task branch is verified; docs-only branch is not', () => {
  const dir = repo('node -e "process.exit(1)"');
  sh(dir, 'checkout', '-q', '-b', 'task/001-T2-docs');
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'product.md'), 'p');
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'docs');
  assert.deepEqual(fire(dir), { status: 0, out: null });

  sh(dir, 'checkout', '-q', '-b', 'task/001-T1-code');
  fs.writeFileSync(path.join(dir, 'app.js'), '1');
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'code');
  assert.equal(fire(dir).out.decision, 'block');
});
