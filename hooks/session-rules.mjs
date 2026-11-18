#!/usr/bin/env node
// SessionStart hook (spec §3.2): in a harness project, print the workflow rules so Claude Code adds them to context.
// The rules live in the plugin (templates/rules.md), so a harness update reaches every project without touching its CLAUDE.md.
// No-op outside harness projects (no harness.json at the repo root).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES = path.join(HERE, '..', 'templates', 'rules.md');

export function projectRoot(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return cwd;
  }
}

/** The text to add to context, or '' outside a harness project. */
export function rulesFor(cwd) {
  const root = projectRoot(cwd);
  if (!fs.existsSync(path.join(root, 'harness.json'))) return '';
  return fs.readFileSync(RULES, 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no or bad stdin */ }
  process.stdout.write(rulesFor(input.cwd || process.cwd()));
}
