#!/usr/bin/env node
// Gathers intervention logs, fit scores and PR stats from harness projects into one benchmark report (spec §8).
// Usage: node collect-logs.mjs <projectDir> [...more] [--out benchmarks/<file>.md] [--no-github]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { feedbackItems, isHarnessComment } from './lib/state.mjs';

export const HARNESS_FAULT = new Set(['agent-mistake', 'missing-context', 'spec-gap', 'manual-trigger']);

export function parseInterventions(text) {
  return text.split(/\r?\n/)
    .filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}/.test(l))
    .map((l) => {
      const [date, feature, task, gear, type, what, wish] = l.split('|').map((c) => c.trim()).slice(1, 8);
      return { date, feature, task, gear, type, what, wish };
    });
}

export function parseFitScores(features) {
  return features.flatMap(({ dir, spec }) => {
    const m = spec?.match(/^Fit score:\s*([1-5])\s*[—-]?\s*(.*)$/m);
    return m ? [{ feature: dir, score: Number(m[1]), note: m[2].trim() }] : [];
  });
}

export function summarize(rows) {
  const byType = {};
  const byGear = {};
  for (const r of rows) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (HARNESS_FAULT.has(r.type)) byGear[r.gear] = (byGear[r.gear] ?? 0) + 1;
  }
  const faults = rows.filter((r) => HARNESS_FAULT.has(r.type)).length;
  return { total: rows.length, faults, errorRate: rows.length ? faults / rows.length : null, byType, byGear };
}

export function prStats(prs) {
  const task = prs.filter((p) => p.headRefName?.startsWith('task/'));
  const firstPass = task.filter((p) => feedbackItems(p).length === 0).length;
  const rework = task.map((p) => (p.comments ?? []).filter((c) => isHarnessComment(c.body)).length);
  return {
    merged: task.length,
    firstPassRate: task.length ? firstPass / task.length : null,
    avgRework: task.length ? rework.reduce((a, b) => a + b, 0) / task.length : null,
  };
}

const pct = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);

function readProject(dir) {
  const read = (p) => (fs.existsSync(path.join(dir, p)) ? fs.readFileSync(path.join(dir, p), 'utf8') : '');
  const featuresDir = path.join(dir, 'docs', 'features');
  const features = fs.existsSync(featuresDir)
    ? fs.readdirSync(featuresDir).filter((d) => /^\d{3}-/.test(d)).map((d) => ({ dir: d, spec: read(`docs/features/${d}/spec.md`) }))
    : [];
  return { name: path.basename(path.resolve(dir)), rows: parseInterventions(read('docs/interventions.md')), fits: parseFitScores(features) };
}

function mergedPrs(dir) {
  const json = execFileSync('gh', ['pr', 'list', '--state', 'merged', '--limit', '200', '--json', 'number,headRefName,reviews,comments'], {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(json);
}

export function report({ projects, harnessVersion, date }) {
  const all = projects.flatMap((p) => p.rows);
  const s = summarize(all);
  const lines = [
    `# Benchmark ${date}`, '',
    `Harness version: \`${harnessVersion}\``, '',
    '| Project | Interventions | Harness-fault | Error rate | Task PRs merged | First-pass merge | Rework (G5 rounds/PR) | Fit scores |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const p of projects) {
    const ps = summarize(p.rows);
    const st = p.prs ?? { merged: 'n/a', firstPassRate: null, avgRework: null };
    lines.push(`| ${p.name} | ${ps.total} | ${ps.faults} | ${pct(ps.errorRate)} | ${st.merged} | ${pct(st.firstPassRate)} | ${st.avgRework === null ? 'n/a' : st.avgRework.toFixed(1)} | ${p.fits.map((f) => `${f.feature}: ${f.score}`).join(', ') || 'n/a'} |`);
  }
  lines.push('', `**Overall error rate:** ${pct(s.errorRate)} (${s.faults} of ${s.total})`, '', '## Bottleneck: harness-fault interventions by gear', '');
  const gears = Object.entries(s.byGear).sort((a, b) => b[1] - a[1]);
  lines.push(...(gears.length ? gears.map(([g, n]) => `- ${g}: ${n}`) : ['- none']));
  lines.push('', '## By type', '', ...Object.entries(s.byType).map(([t, n]) => `- ${t}: ${n}`));
  lines.push('', '## Notes', '', '<!-- Quan: total time, active time estimate, one sentence on fit. -->', '');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const out = oi >= 0 ? args.splice(oi, 2)[1] : null;
  const noGithub = args.includes('--no-github');
  const dirs = args.filter((a) => !a.startsWith('--'));
  if (!dirs.length) { console.error('usage: collect-logs.mjs <projectDir...> [--out file] [--no-github]'); process.exit(2); }
  const harnessRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  let harnessVersion = 'unknown';
  try { harnessVersion = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], { cwd: harnessRoot, encoding: 'utf8' }).trim(); } catch { /* keep unknown */ }
  const projects = dirs.map((d) => {
    const p = readProject(d);
    if (!noGithub) { try { p.prs = prStats(mergedPrs(d)); } catch { /* no GitHub: leave n/a */ } }
    return p;
  });
  const md = report({ projects, harnessVersion, date: new Date().toISOString().slice(0, 10) });
  if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, md); console.log(`wrote ${out}`); } else console.log(md);
}
