import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProject, detectVerify } from '../scripts/init-project.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'harness-init-'));

test('scaffolds an empty repo', () => {
  const root = tmp();
  const r = initProject(root, { name: 'habits' });
  assert.deepEqual(r.created.sort(), ['CLAUDE.md', 'docs/decisions.md', 'docs/features/.gitkeep', 'docs/interventions.md', 'docs/product.md', 'harness.json'].sort());
  assert.match(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), /^# habits$/m);
  assert.ok(r.warnings.some((w) => w.includes('no "verify"')));
});

test('is idempotent and never overwrites', () => {
  const root = tmp();
  initProject(root, { verify: 'npm test' });
  fs.writeFileSync(path.join(root, 'docs/product.md'), 'mine');
  const r = initProject(root, { verify: 'other' });
  assert.equal(r.created.length, 0);
  assert.equal(fs.readFileSync(path.join(root, 'docs/product.md'), 'utf8'), 'mine');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'harness.json'), 'utf8')).verify, 'npm test');
});

test('detects verify commands', () => {
  const root = tmp();
  assert.equal(detectVerify(root), null);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
  assert.equal(detectVerify(root), 'npm test');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }));
  assert.equal(detectVerify(root), null);
});

test('warns when an existing CLAUDE.md is not a harness one', () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# old rules');
  assert.ok(initProject(root, { verify: 'x' }).warnings.some((w) => w.includes('CLAUDE.md already exists')));
});
