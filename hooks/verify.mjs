#!/usr/bin/env node
// Stop hook (spec §7): in a harness project, run the project's verify command before the agent may stop.
// No-op outside harness projects (no harness.json) and when nothing but docs changed since the last pass.
// After 3 failures in a row it lets the agent stop and tells Quan (stop-and-ask rule, spec §4.6).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MAX_FAILURES = 3;

export function isDocPath(p) {
  return p.startsWith('docs/') || /\.md$/i.test(p);
}

const git = (root, args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
};

function changedPaths(root) {
  const out = git(root, ['status', '--porcelain']) ?? '';
  return out.split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
}

function headHasCode(root, head) {
  // Does the branch carry non-doc changes relative to the default branch?
  const base = git(root, ['rev-parse', '--verify', '--quiet', 'master']) ? 'master' : 'main';
  const files = (git(root, ['diff', '--name-only', `${base}...${head}`]) ?? '').split('\n').filter(Boolean);
  return files.some((p) => !isDocPath(p));
}

function statePath(root) {
  const h = crypto.createHash('sha1').update(path.resolve(root).toLowerCase()).digest('hex').slice(0, 12);
  return path.join(os.tmpdir(), `harness-verify-${h}.json`);
}

function loadState(root) {
  try { return JSON.parse(fs.readFileSync(statePath(root), 'utf8')); } catch { return { failures: 0 }; }
}

function saveState(root, state) {
  try { fs.writeFileSync(statePath(root), JSON.stringify(state)); } catch { /* best effort */ }
}

export function run(input, { env = process.env } = {}) {
  const root = git(input.cwd || process.cwd(), ['rev-parse', '--show-toplevel']) ?? input.cwd ?? process.cwd();
  const cfgPath = path.join(root, 'harness.json');
  if (!fs.existsSync(cfgPath)) return { exit: 0 };
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) {
    return { exit: 0, out: { systemMessage: `harness: harness.json is not valid JSON (${e.message}); verify skipped.` } };
  }
  if (!cfg.verify) return { exit: 0 };

  const state = loadState(root);
  const head = git(root, ['rev-parse', 'HEAD']);
  const changed = changedPaths(root);
  const headNeedsCheck = head && state.lastPassedHead !== head && state.lastCheckedHead !== head && headHasCode(root, head);
  if (!changed.some((p) => !isDocPath(p)) && !headNeedsCheck) {
    if (head && state.lastCheckedHead !== head) saveState(root, { ...state, lastCheckedHead: head });
    return { exit: 0 };
  }

  const timeout = (cfg.verifyTimeoutSec ?? 300) * 1000;
  // A parent `node --test` leaks NODE_TEST_CONTEXT, which makes a child `node --test` report to it and exit 0.
  const { NODE_TEST_CONTEXT, ...cleanEnv } = env;
  const r = spawnSync(cfg.verify, { cwd: root, shell: true, encoding: 'utf8', timeout, env: cleanEnv });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const tail = output.split('\n').slice(-40).join('\n');

  if (r.status === 0) {
    saveState(root, { failures: 0, lastPassedHead: changed.length ? state.lastPassedHead : head, lastCheckedHead: head });
    return { exit: 0 };
  }

  const failures = (state.failures ?? 0) + 1;
  if (failures >= MAX_FAILURES) {
    saveState(root, { ...state, failures: 0 });
    return {
      exit: 0,
      out: { systemMessage: `harness: verify (\`${cfg.verify}\`) failed ${MAX_FAILURES} times in a row. Stopping so Quan can look (stop-and-ask rule).` },
    };
  }
  saveState(root, { ...state, failures });
  const why = r.error ? `could not run: ${r.error.message}` : `exit code ${r.status}`;
  return {
    exit: 0,
    out: {
      decision: 'block',
      reason: `harness verify failed (attempt ${failures}/${MAX_FAILURES}, ${why}): \`${cfg.verify}\`\n\n${tail}\n\nFix the cause and finish. If the fix would leave the task's scope or change an acceptance criterion, stop and ask Quan instead.`,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  let input = {};
  try { input = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
  const result = run(input);
  if (result.out) process.stdout.write(JSON.stringify(result.out));
  process.exit(result.exit);
}
