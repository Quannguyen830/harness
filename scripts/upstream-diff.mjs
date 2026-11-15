#!/usr/bin/env node
// Compares each vendored component (SOURCES.md) with its upstream's current default branch.
// Never changes anything: it downloads upstream into a temp dir and prints a diff for Quan to judge.
// Usage: node upstream-diff.mjs [component-path-filter] [--full]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseSources(text) {
  return text.split(/\r?\n/)
    .filter((l) => /^\|\s*[a-z]/.test(l) && !/^\|\s*Component/.test(l))
    .map((l) => {
      const [component, upstream, version] = l.split('|').map((c) => c.trim()).slice(1, 4);
      const m = upstream.match(/github\.com\/([^/\s]+\/[^/\s)]+)\s*\(([^)]+)\)/);
      return { component, version, repo: m?.[1] ?? null, upstreamPath: m?.[2] ?? null };
    });
}

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });

function download(repo, ref, upstreamPath, dest) {
  const entries = JSON.parse(gh(['api', `repos/${repo}/contents/${upstreamPath}?ref=${ref}`]));
  if (!Array.isArray(entries)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(entries.content, 'base64'));
    return;
  }
  for (const e of entries) {
    const target = path.join(dest, e.name);
    if (e.type === 'dir') download(repo, ref, e.path, target);
    else if (e.type === 'file') {
      fs.mkdirSync(dest, { recursive: true });
      const file = JSON.parse(gh(['api', `repos/${repo}/contents/${e.path}?ref=${ref}`]));
      fs.writeFileSync(target, Buffer.from(file.content, 'base64'));
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const filter = args.find((a) => !a.startsWith('--'));
  const rows = parseSources(fs.readFileSync(path.join(root, 'SOURCES.md'), 'utf8')).filter((r) => !filter || r.component.includes(filter));
  const heads = {};
  for (const r of rows) {
    if (!r.repo) { console.log(`- ${r.component}: no GitHub upstream path in SOURCES.md, skipped`); continue; }
    const branch = heads[r.repo]?.branch ?? JSON.parse(gh(['api', `repos/${r.repo}`])).default_branch;
    const sha = heads[r.repo]?.sha ?? gh(['api', `repos/${r.repo}/commits/${branch}`, '--jq', '.sha']).trim();
    heads[r.repo] = { branch, sha };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-upstream-'));
    const dest = path.join(tmp, path.basename(r.component));
    try {
      download(r.repo, sha, r.upstreamPath, dest);
    } catch (e) {
      console.log(`- ${r.component}: could not fetch ${r.repo}/${r.upstreamPath} (${String(e.message).split('\n')[0]})`);
      continue;
    }
    const local = path.join(root, r.component);
    const d = spawnSync('git', ['diff', '--no-index', full ? '--stat=120' : '--shortstat', dest, local], { encoding: 'utf8' });
    const summary = d.stdout.trim() || 'identical';
    console.log(`- ${r.component} — vendored ${r.version}; upstream ${r.repo}@${sha.slice(0, 7)} (${r.upstreamPath}): ${summary.split('\n').at(-1).trim()}`);
    if (full && d.stdout.trim()) {
      const patch = spawnSync('git', ['diff', '--no-index', dest, local], { encoding: 'utf8' }).stdout;
      console.log(patch.split('\n').map((l) => `    ${l}`).join('\n'));
    }
  }
  console.log('\nDiffs include the local changes recorded in SOURCES.md. Take an upstream change on purpose: copy it in, update the SOURCES.md version, open a PR.');
}
