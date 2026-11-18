#!/usr/bin/env node
// Starts a feature (spec §4.1): picks the next number across master and every feature branch,
// creates branch feature/<NNN-slug> from the latest default branch, and writes grill.md from the template.
// Usage: node new-feature.mjs "<idea>" [--root <dir>] [--slug <slug>] [--no-branch]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STOP = new Set(['a', 'an', 'the', 'that', 'which', 'to', 'of', 'for', 'in', 'on', 'with', 'and']);

export function slugify(text, maxWords = 5) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/).filter(Boolean)
    .filter((w, _, all) => !STOP.has(w) || all.every((x) => STOP.has(x)))
    .slice(0, maxWords).join('-') || 'feature';
}

export function nextNumber(existing) {
  const nums = existing.map((d) => Number(String(d).replace(/^.*\//, '').match(/^(\d{3})-/)?.[1])).filter((n) => !Number.isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}

const tryGit = (root, args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
};

export function existingFeatures(root) {
  const dir = path.join(root, 'docs', 'features');
  const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const refs = (tryGit(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/feature/', 'refs/remotes/origin/feature/']) ?? '').split('\n');
  const onMaster = (tryGit(root, ['ls-tree', '--name-only', 'origin/master', 'docs/features/']) ?? '').split('\n');
  return [...onDisk, ...refs, ...onMaster].filter(Boolean);
}

export function createFeature(root, idea, { slug, date = new Date().toISOString().slice(0, 10), templateDir, branch = false } = {}) {
  const dir = `${nextNumber(existingFeatures(root))}-${slug ?? slugify(idea)}`;
  if (branch) {
    const base = tryGit(root, ['rev-parse', '--verify', '--quiet', 'master']) ? 'master' : 'main';
    execFileSync('git', ['checkout', '-q', base], { cwd: root, stdio: 'ignore' });
    if (tryGit(root, ['remote'])) tryGit(root, ['pull', '-q', '--ff-only']);
    execFileSync('git', ['checkout', '-q', '-b', `feature/${dir}`], { cwd: root, stdio: 'ignore' });
  }
  const target = path.join(root, 'docs', 'features', dir);
  fs.mkdirSync(target, { recursive: true });
  const tpl = fs.readFileSync(path.join(templateDir, 'grill.md'), 'utf8');
  const firstLine = idea.split(/\r?\n/)[0].trim();
  fs.writeFileSync(path.join(target, 'grill.md'), tpl.replaceAll('{{title}}', firstLine).replaceAll('{{idea}}', idea.trim()).replaceAll('{{date}}', date));
  return { dir, branch: `feature/${dir}`, grill: path.join(target, 'grill.md') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const root = opt('--root') ?? process.cwd();
  const slug = opt('--slug');
  const noBranch = args.includes('--no-branch');
  const idea = args.filter((a) => a !== '--no-branch').join(' ').trim();
  if (!idea) { console.error('usage: new-feature.mjs "<idea>" [--root dir] [--slug slug] [--no-branch]'); process.exit(2); }
  const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
  console.log(JSON.stringify(createFeature(root, idea, { slug, templateDir, branch: !noBranch })));
}
