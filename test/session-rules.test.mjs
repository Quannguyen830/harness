import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const hook = path.resolve('hooks/session-rules.mjs');
const fire = (cwd) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, source: 'startup' }), encoding: 'utf8' });

function repo(harness) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-rules-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  if (harness) fs.writeFileSync(path.join(dir, 'harness.json'), '{"verify":"npm test"}');
  fs.mkdirSync(path.join(dir, 'src'));
  return dir;
}

test('prints the workflow rules in a harness project, also from a subfolder', () => {
  const dir = repo(true);
  for (const cwd of [dir, path.join(dir, 'src')]) {
    const r = fire(cwd);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^# Harness rules/);
    assert.match(r.stdout, /feature\/<NNN-slug>/);
  }
});

test('prints nothing outside a harness project', () => {
  const r = fire(repo(false));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
