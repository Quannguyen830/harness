// Project state for /next (spec §4.2, workflow v2: one branch + one PR per feature, several open features).
// `decide` and `featureStep` are pure; `collectFacts` reads git and GitHub.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const QUESTION_RE = /^>\s*QUESTION\b/m;
export const FIT_RE = /^Fit score:\s*[1-5]/m;
export const TASK_RE = /^- \[( |x|X)\] (T\d+):\s*(.*)$/;
export const FEATURE_BRANCH = 'feature/';

export function parseStatus(text) {
  return text?.match(/^>?\s*Status:\s*(\w+)/im)?.[1]?.toLowerCase() ?? null;
}

export function parseTasks(text) {
  const tasks = [];
  for (const line of (text ?? '').split(/\r?\n/)) {
    const m = line.match(TASK_RE);
    if (!m) continue;
    const after = m[3].match(/\(after:\s*([^)]*)\)/)?.[1];
    tasks.push({
      id: m[2],
      done: m[1].toLowerCase() === 'x',
      title: m[3].replace(/\s*\((covers|after):[^)]*\)/g, '').trim(),
      after: after ? after.split(/[,\s]+/).filter(Boolean) : [],
    });
  }
  return tasks;
}

export function isHarnessComment(body) {
  return /^\s*\[harness\]/.test(body ?? '');
}

// ---------- per-feature and global decisions (pure) ----------

const WORK = ['feedback', 'execute', 'pr', 'spec'];
const NEEDS_QUAN = ['question', 'grill', 'gate-a', 'gate-b'];
const RANK = [...WORK, ...NEEDS_QUAN];

/**
 * feature = { dir, branch, grill, spec, pr: { number, url, isDraft, unansweredAt } | null }
 * returns { step, reason, task? }
 */
export function featureStep(f) {
  const pr = f.pr;
  if (pr?.unansweredAt) return { step: 'feedback', reason: `PR #${pr.number} has a comment without a [harness] reply.` };
  const docs = [f.grill, f.spec].filter(Boolean);
  if (docs.some((d) => QUESTION_RE.test(d))) return { step: 'question', reason: 'A > QUESTION block is waiting for Quan.' };
  if (!f.grill || parseStatus(f.grill) !== 'done') return { step: 'grill', reason: 'Grill log missing or not Status: done.' };
  if (!f.spec) return { step: 'spec', reason: 'Grill done, no spec yet.' };
  if (!pr) return { step: 'spec', reason: 'Spec written but no draft PR yet: finish G2 by opening it.' };
  if (parseStatus(f.spec) !== 'approved') return { step: 'gate-a', reason: `Spec waits for approval on draft PR #${pr.number} (say or comment "approved").` };
  const tasks = parseTasks(f.spec);
  const done = new Set(tasks.filter((t) => t.done).map((t) => t.id));
  const ready = tasks.find((t) => !t.done && t.after.every((d) => done.has(d)));
  if (ready) return { step: 'execute', task: ready.id, reason: `Task ${ready.id} is ready: ${ready.title}` };
  if (tasks.some((t) => !t.done)) return { step: 'question', reason: 'Unchecked tasks remain but none is ready (dependency problem in the spec).' };
  if (pr.isDraft) return { step: 'pr', reason: 'All tasks are checked; self-review and mark the PR ready.' };
  const fit = FIT_RE.test(f.spec) ? '' : ' Ask for the fit score ("Fit: N — ...").';
  return { step: 'gate-b', reason: `PR #${pr.number} is ready for Quan's review and merge.${fit}` };
}

/**
 * facts = {
 *   harnessProject, idea, branch, otherDocs: [text],
 *   features: [feature] (open features only, oldest first),
 *   staleBranch: string|null (current branch is a merged/closed feature branch)
 * }
 */
export function decide(facts) {
  if (!facts.harnessProject) {
    return { step: 'init', reason: 'No harness.json here. Run scripts/init-project.mjs in this repo first.' };
  }
  const cleanup = facts.staleBranch ? `You are on ${facts.staleBranch}, which is already merged or closed: run "git checkout master" and "git pull" first.` : undefined;
  const withCleanup = (r) => (cleanup ? { ...r, cleanup } : r);
  if (facts.idea) return withCleanup({ step: 'grill', reason: 'New idea: start a feature on a new branch.', idea: facts.idea });

  if ((facts.otherDocs ?? []).some((d) => QUESTION_RE.test(d))) {
    return withCleanup({ step: 'question', reason: 'A > QUESTION block in docs/product.md or docs/decisions.md is waiting for Quan.' });
  }
  const steps = (facts.features ?? []).map((f, i) => ({ ...featureStep(f), feature: f.dir, branch: f.branch, pr: f.pr ?? undefined, order: i }));
  if (!steps.length) return withCleanup({ step: 'idle', reason: 'No open feature. Start one with /next <idea>.' });

  steps.sort((a, b) => RANK.indexOf(a.step) - RANK.indexOf(b.step) || a.order - b.order);
  const [chosen] = steps;
  const waiting = steps.filter((s) => s !== chosen && NEEDS_QUAN.includes(s.step))
    .map(({ step, feature, reason, pr }) => ({ step, feature, reason, pr: pr?.url }));
  const { order, ...result } = chosen;
  if (waiting.length) result.waiting = waiting;
  result.kind = WORK.includes(chosen.step) ? 'work' : 'needs-quan';
  return withCleanup(result);
}

// ---------- GitHub feedback helpers (pure) ----------

/** Normalise a PR's reviews, conversation comments and inline comments into feedback items (harness replies excluded). */
export function feedbackItems(pr, inline = []) {
  return [
    ...(pr.reviews ?? []).filter((r) => r.state !== 'APPROVED' || r.body)
      .map((r) => ({ kind: `review:${r.state}`, at: r.submittedAt, author: r.author?.login, body: r.body ?? '' })),
    ...(pr.comments ?? []).map((c) => ({ kind: 'comment', at: c.createdAt, author: c.author?.login, body: c.body ?? '' })),
    ...inline.map((c) => ({ kind: 'inline', at: c.created_at, author: c.user?.login, body: c.body ?? '', path: c.path, line: c.line ?? c.original_line })),
  ].filter((f) => f.at && f.body.trim() && !isHarnessComment(f.body)).sort((a, b) => (a.at < b.at ? -1 : 1));
}

export function lastHarnessReplyAt(pr, inline = []) {
  const times = [
    ...(pr.comments ?? []).filter((c) => isHarnessComment(c.body)).map((c) => c.createdAt),
    ...inline.filter((c) => isHarnessComment(c.body)).map((c) => c.created_at),
  ].filter(Boolean).sort();
  return times.at(-1) ?? null;
}

/** Feedback items posted after the last [harness] reply. */
export function unanswered(pr, inline = []) {
  const since = lastHarnessReplyAt(pr, inline);
  return feedbackItems(pr, inline).filter((f) => !since || f.at > since);
}

// ---------- impure side ----------

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (root, args) => { try { return git(root, args); } catch { return null; } };
const gh = (root, args) => execFileSync('gh', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const PR_FIELDS = 'number,title,headRefName,url,state,isDraft,reviews,comments';

function inlineComments(root, number) {
  const nameWithOwner = gh(root, ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
  return JSON.parse(gh(root, ['api', `repos/${nameWithOwner}/pulls/${number}/comments`]));
}

/** All PRs from feature branches, normalised: { number, url, headRefName, state, isDraft, unansweredAt }. */
export function collectGitHub(root) {
  const prs = JSON.parse(gh(root, ['pr', 'list', '--state', 'all', '--limit', '200', '--json', PR_FIELDS]))
    .filter((p) => p.headRefName?.startsWith(FEATURE_BRANCH));
  return prs.map((p) => {
    const inline = p.state === 'OPEN' ? inlineComments(root, p.number) : [];
    const open = p.state === 'OPEN' ? unanswered(p, inline) : [];
    return { number: p.number, url: p.url, title: p.title, headRefName: p.headRefName, state: p.state, isDraft: p.isDraft, unansweredAt: open.at(-1)?.at ?? null };
  });
}

/** Unanswered feedback on one PR, for G5. */
export function fetchUnaddressed(root, number) {
  const p = JSON.parse(gh(root, ['pr', 'view', String(number), '--json', PR_FIELDS]));
  const inline = inlineComments(root, number);
  return { number: p.number, title: p.title, url: p.url, branch: p.headRefName, isDraft: p.isDraft, items: unanswered(p, inline) };
}

function featureBranches(root) {
  const out = tryGit(root, ['for-each-ref', '--format=%(refname:short)', `refs/heads/${FEATURE_BRANCH}`, `refs/remotes/origin/${FEATURE_BRANCH}`]) ?? '';
  const names = new Set(out.split('\n').filter(Boolean).map((r) => r.replace(/^origin\//, '')));
  return [...names].sort();
}

function readFromBranch(root, branch, rel, current) {
  if (branch === current) return readIf(path.join(root, rel));
  for (const ref of [branch, `origin/${branch}`]) {
    const t = tryGit(root, ['show', `${ref}:${rel}`]);
    if (t !== null) return t;
  }
  return null;
}

export function collectFacts(root, { idea = null, github = collectGitHub, fetch = true } = {}) {
  const facts = { harnessProject: fs.existsSync(path.join(root, 'harness.json')), idea, features: [], otherDocs: [], ghError: null, staleBranch: null };
  if (fetch && tryGit(root, ['remote'])) {
    try { execFileSync('git', ['fetch', '-q', '--prune', 'origin'], { cwd: root, stdio: 'ignore', timeout: 20000 }); } catch { /* offline */ }
  }
  facts.branch = tryGit(root, ['branch', '--show-current']) ?? '';
  let prs = [];
  try { prs = github(root); } catch (e) { facts.ghError = String(e.message ?? e).split('\n')[0]; }

  const closed = new Set(prs.filter((p) => p.state !== 'OPEN').map((p) => p.headRefName));
  const openPr = new Map(prs.filter((p) => p.state === 'OPEN').map((p) => [p.headRefName, p]));
  if (facts.branch.startsWith(FEATURE_BRANCH) && closed.has(facts.branch) && !openPr.has(facts.branch)) facts.staleBranch = facts.branch;

  const branches = new Set([...featureBranches(root), ...openPr.keys()]);
  for (const branch of [...branches].sort()) {
    if (closed.has(branch) && !openPr.has(branch)) continue;
    const dir = branch.slice(FEATURE_BRANCH.length);
    const rel = `docs/features/${dir}`;
    facts.features.push({
      dir, branch,
      grill: readFromBranch(root, branch, `${rel}/grill.md`, facts.branch),
      spec: readFromBranch(root, branch, `${rel}/spec.md`, facts.branch),
      pr: openPr.get(branch) ?? null,
    });
  }
  for (const f of ['product.md', 'decisions.md']) {
    const t = readIf(path.join(root, 'docs', f));
    if (t) facts.otherDocs.push(t);
  }
  return facts;
}
