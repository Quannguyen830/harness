#!/usr/bin/env node
// Scaffolds a harness project (spec §7). Idempotent: never overwrites an existing file.
// Usage: node init-project.mjs [--root <dir>] [--verify "<command>"] [--name <name>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'project');

export function detectVerify(root) {
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const test = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).scripts?.test;
      if (test && !/no test specified/.test(test)) return 'npm test';
    } catch { /* fall through */ }
  }
  if (fs.existsSync(path.join(root, 'pyproject.toml'))) return 'pytest';
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) return 'cargo test';
  if (fs.existsSync(path.join(root, 'go.mod'))) return 'go test ./...';
  return null;
}

export function initProject(root, { verify, name } = {}) {
  const created = [];
  const skipped = [];
  const projectName = name ?? path.basename(path.resolve(root));
  const write = (rel, content) => {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) { skipped.push(rel); return; }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    created.push(rel);
  };
  const fromTemplate = (file) => fs.readFileSync(path.join(TEMPLATES, file), 'utf8').replaceAll('{{name}}', projectName);

  const verifyCmd = verify ?? detectVerify(root) ?? '';
  write('harness.json', `${JSON.stringify({ verify: verifyCmd }, null, 2)}\n`);
  write('CLAUDE.md', fromTemplate('CLAUDE.md'));
  write('docs/product.md', fromTemplate('product.md'));
  write('docs/decisions.md', fromTemplate('decisions.md'));
  write('docs/interventions.md', fromTemplate('interventions.md'));
  write('docs/features/.gitkeep', '');

  const warnings = [];
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'harness.json'), 'utf8'));
  if (!cfg.verify) warnings.push('harness.json has no "verify" command yet: the Stop hook does nothing until you set one (e.g. "npm test").');
  if (skipped.includes('CLAUDE.md') && !fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').includes('harness:project')) {
    warnings.push(`CLAUDE.md already exists and was left alone; merge in ${path.join(TEMPLATES, 'CLAUDE.md')} by hand.`);
  }
  return { created, skipped, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const root = opt('--root') ?? process.cwd();
  const r = initProject(root, { verify: opt('--verify'), name: opt('--name') });
  for (const f of r.created) console.log(`  + ${f}`);
  for (const f of r.skipped) console.log(`  = ${f} (exists, untouched)`);
  for (const w of r.warnings) console.log(`  ! ${w}`);
  console.log('harness project ready. Commit these files, then type /next <idea>.');
}
