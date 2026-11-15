#!/usr/bin/env node
// Creates docs/features/<NNN-slug>/grill.md from templates/grill.md and prints its path.
// Usage: node new-feature.mjs "<idea>" [--root <dir>] [--slug <slug>]
import fs from 'node:fs';
import path from 'node:path';
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
  const nums = existing.map((d) => Number(d.match(/^(\d{3})-/)?.[1])).filter((n) => !Number.isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}

export function createFeature(root, idea, { slug, date = new Date().toISOString().slice(0, 10), templateDir } = {}) {
  const featuresDir = path.join(root, 'docs', 'features');
  fs.mkdirSync(featuresDir, { recursive: true });
  const dir = `${nextNumber(fs.readdirSync(featuresDir))}-${slug ?? slugify(idea)}`;
  const target = path.join(featuresDir, dir);
  fs.mkdirSync(target);
  const tpl = fs.readFileSync(path.join(templateDir, 'grill.md'), 'utf8');
  const firstLine = idea.split(/\r?\n/)[0].trim();
  const body = tpl.replaceAll('{{title}}', firstLine).replaceAll('{{idea}}', idea.trim()).replaceAll('{{date}}', date);
  fs.writeFileSync(path.join(target, 'grill.md'), body);
  return { dir, grill: path.join(target, 'grill.md') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const root = opt('--root') ?? process.cwd();
  const slug = opt('--slug');
  const idea = args.join(' ').trim();
  if (!idea) { console.error('usage: new-feature.mjs "<idea>" [--root dir] [--slug slug]'); process.exit(2); }
  const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
  console.log(JSON.stringify(createFeature(root, idea, { slug, templateDir })));
}
