#!/usr/bin/env node
// Checks the harness's structural invariants (spec §9 "Checks for v0.1 and v0.2").
// Usage: node scripts/selftest.mjs [repoRoot]   — exits 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const failures = [];
const fail = (msg) => failures.push(msg);
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const listDir = (p) => (exists(p) ? fs.readdirSync(path.join(root, p)) : []);

const REQUIRED_FIELDS = ['Purpose', 'Triggered when', 'Input', 'Output', 'Gate', 'Stop conditions', 'Components', 'Delete when'];

export function parseContract(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- ([A-Za-z ]+):\s*(.*)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

export function splitPaths(value) {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function checkJson(p, required = []) {
  if (!exists(p)) return fail(`${p} is missing`);
  try {
    const obj = JSON.parse(read(p));
    for (const key of required) if (!(key in obj)) fail(`${p} lacks "${key}"`);
    return obj;
  } catch (e) {
    fail(`${p} is not valid JSON: ${e.message}`);
  }
}

// 1. Manifests
checkJson('.claude-plugin/plugin.json', ['name', 'version', 'description']);
checkJson('.claude-plugin/marketplace.json', ['name', 'owner', 'plugins']);
if (exists('hooks/hooks.json')) {
  const hooks = checkJson('hooks/hooks.json', ['hooks']);
  for (const groups of Object.values(hooks?.hooks ?? {})) {
    for (const group of groups) {
      for (const h of group.hooks ?? []) {
        const m = h.command?.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/);
        if (m && !exists(m[1])) fail(`hooks/hooks.json points at missing ${m[1]}`);
      }
    }
  }
}

if (exists('.mcp.json')) {
  const mcp = checkJson('.mcp.json');
  for (const [name, server] of Object.entries(mcp ?? {})) {
    for (const arg of server.args ?? []) {
      if (/@latest\b/.test(arg) || /^@?[\w./-]+$/.test(arg) && arg.startsWith('@') && !/@\d/.test(arg.slice(1))) {
        fail(`.mcp.json server "${name}" must pin an exact version (got ${arg})`);
      }
    }
  }
}

// 1b. One version number (spec D25): the spec header carries the plugin version
if (exists('docs/spec.md') && exists('.claude-plugin/plugin.json')) {
  const specVersion = read('docs/spec.md').match(/^> Version:\s*(\d+\.\d+\.\d+)/m)?.[1];
  const pluginVersion = JSON.parse(read('.claude-plugin/plugin.json')).version;
  if (specVersion !== pluginVersion) fail(`docs/spec.md version (${specVersion ?? 'missing'}) must equal plugin.json version (${pluginVersion})`);
}

// 2. Gear contracts
const used = new Set();
const gearFiles = listDir('gears').filter((f) => f.endsWith('.md') && f !== 'README.md');
for (const f of gearFiles) {
  const text = read(`gears/${f}`);
  const name = f.replace(/\.md$/, '');
  if (!text.startsWith(`# Gear: ${name}`)) fail(`gears/${f} must start with "# Gear: ${name}"`);
  const fields = parseContract(text);
  for (const field of REQUIRED_FIELDS) if (!fields[field]) fail(`gears/${f} lacks "${field}"`);
  for (const p of splitPaths(fields.Components)) {
    if (!exists(p)) fail(`gears/${f} names missing component ${p}`);
    used.add(p.replace(/\/$/, ''));
  }
}
const readme = exists('gears/README.md') ? read('gears/README.md') : '';
const onDemand = splitPaths(readme.match(/^- On-demand:\s*(.*)$/m)?.[1]);
for (const p of onDemand) {
  if (!exists(p)) fail(`gears/README.md lists missing on-demand component ${p}`);
  used.add(p);
}

// 3. Components: skills, commands, agents — one of each, all accounted for
const names = new Map();
const claim = (name, where) => {
  if (names.has(name)) fail(`duplicate component name "${name}": ${names.get(name)} and ${where}`);
  names.set(name, where);
};
for (const dir of listDir('skills')) {
  const p = `skills/${dir}`;
  if (!exists(`${p}/SKILL.md`)) { fail(`${p} has no SKILL.md`); continue; }
  const fm = parseFrontmatter(read(`${p}/SKILL.md`));
  if (!fm?.name || !fm?.description) fail(`${p}/SKILL.md needs name and description frontmatter`);
  else if (fm.name !== dir) fail(`${p}/SKILL.md name "${fm.name}" must match folder "${dir}"`);
  claim(dir, p);
  if (!used.has(p)) fail(`${p} is used by no gear and not listed as on-demand`);
}
for (const kind of ['commands', 'agents']) {
  for (const f of listDir(kind).filter((x) => x.endsWith('.md'))) {
    const p = `${kind}/${f}`;
    const fm = parseFrontmatter(read(p));
    if (!fm?.description) fail(`${p} needs description frontmatter`);
    claim(f.replace(/\.md$/, ''), p);
    if (!used.has(p)) fail(`${p} is used by no gear and not listed as on-demand`);
  }
}

// 4. SOURCES.md: every borrowed component exists and carries its license
if (!exists('SOURCES.md')) fail('SOURCES.md is missing');
else {
  const rows = read('SOURCES.md').split(/\r?\n/).filter((l) => /^\|\s*[a-z]/.test(l) && !/^\|\s*Component/.test(l));
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    const [component, upstream, version, license] = cells.slice(1, 5);
    if (!exists(component)) fail(`SOURCES.md lists missing component ${component}`);
    if (!upstream || !version) fail(`SOURCES.md row for ${component} lacks upstream or version`);
    const lic = license?.match(/vendor-licenses\/\S+?(?=\)|$|\s)/)?.[0];
    if (!lic || !exists(lic)) fail(`SOURCES.md row for ${component} must point at an existing vendor-licenses/ file`);
  }
}

if (failures.length) {
  console.error(`selftest: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`selftest: ok (${gearFiles.length} gears, ${names.size} named components)`);
