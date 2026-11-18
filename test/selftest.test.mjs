import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/selftest.mjs');
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-selftest-'));
  for (const [p, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), content);
  }
  return dir;
}

const base = {
  '.claude-plugin/plugin.json': '{"name":"h","version":"0.0.1","description":"d"}',
  '.claude-plugin/marketplace.json': '{"name":"h","owner":{},"plugins":[]}',
  'SOURCES.md': '| Component | Upstream | Version | License | Changes |\n|---|---|---|---|---|\n',
  'skills/grill/SKILL.md': '---\nname: grill\ndescription: d\n---\n',
  'gears/grill.md': '# Gear: grill\n- Purpose: p\n- Triggered when: t\n- Input: i\n- Output: o\n- Gate: none\n- Stop conditions: s\n- Components: skills/grill\n- Delete when: d\n',
};

test('passes on the real repo', () => {
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('passes on a minimal valid fixture', () => {
  assert.equal(run(fixture(base)).status, 0);
});

test('fails when a contract names a missing component', () => {
  const r = run(fixture({ ...base, 'gears/grill.md': base['gears/grill.md'].replace('skills/grill', 'skills/grill, templates/nope.md') }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing component templates\/nope\.md/);
});

test('fails when a contract field is missing', () => {
  const r = run(fixture({ ...base, 'gears/grill.md': base['gears/grill.md'].replace(/- Delete when: d\n/, '') }));
  assert.match(r.stderr, /lacks "Delete when"/);
});

test('fails on an orphan skill', () => {
  const r = run(fixture({ ...base, 'skills/extra/SKILL.md': '---\nname: extra\ndescription: d\n---\n' }));
  assert.match(r.stderr, /skills\/extra is used by no gear/);
});

test('fails on duplicate names across kinds', () => {
  const r = run(fixture({ ...base, 'commands/grill.md': '---\ndescription: d\n---\n', 'gears/README.md': '- On-demand: commands/grill.md\n' }));
  assert.match(r.stderr, /duplicate component name "grill"/);
});

test('fails when a SOURCES row lacks a license file', () => {
  const r = run(fixture({ ...base, 'SOURCES.md': base['SOURCES.md'] + '| skills/grill | https://x | 1.0 | MIT | none |\n' }));
  assert.match(r.stderr, /vendor-licenses/);
});

test('fails on an unpinned MCP server', () => {
  const r = run(fixture({ ...base, '.mcp.json': '{"pw":{"command":"npx","args":["@playwright/mcp@latest"]}}' }));
  assert.match(r.stderr, /must pin an exact version/);
  assert.equal(run(fixture({ ...base, '.mcp.json': '{"pw":{"command":"npx","args":["@playwright/mcp@0.0.84"]}}' })).status, 0);
});
