// Project state for /next (spec §4.2). `decide` is pure; `collectFacts` reads the repo and GitHub.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const QUESTION_RE = /^>\s*QUESTION\b/m;
export const FIT_RE = /^Fit score:\s*[1-5]/m;
export const TASK_RE = /^- \[( |x|X)\] (T\d+):\s*(.*)$/;

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

export function taskBranchPrefix(featureDir, taskId) {
  return `task/${featureDir.split('-')[0]}-${taskId}-`;
}

export function isHarnessComment(body) {
  return /^\s*\[harness\]/.test(body ?? '');
}

/**
 * facts = {
 *   harnessProject: bool,
 *   features: [{ dir, grill: text|null, spec: text|null, specOnMaster: text|null }]  (sorted by dir),
 *   otherDocs: [text]            (product.md, decisions.md),
 *   branch: string, branchAhead: bool, dirty: bool,
 *   prs: [{ number, title, headRefName, lastCommitAt, feedbackAt }]  (open PRs; feedbackAt = newest non-harness review/comment)
 *   ghError: string|null,
 *   idea: string|null,
 * }
 * returns { step, reason, feature?, task?, prs? }
 */
export function decide(facts) {
  if (!facts.harnessProject) {
    return { step: 'init', reason: 'No harness.json here. Run scripts/init-project.mjs in this repo first.' };
  }
  const features = facts.features ?? [];
  const isOpen = (f) => {
    const spec = f.specOnMaster ?? f.spec;
    if (!spec || parseStatus(spec) !== 'approved') return true;
    return parseTasks(spec).some((t) => !t.done) || !FIT_RE.test(spec);
  };
  const current = [...features].reverse().find(isOpen) ?? null;

  if (facts.idea) {
    if (current) {
      return { step: 'question', reason: `Feature ${current.dir} is still open. Finish it first, or tell me to park it.`, feature: current.dir };
    }
    return { step: 'grill', reason: 'New idea: start a feature.', idea: facts.idea };
  }

  const docs = [...(facts.otherDocs ?? []), current?.grill, current?.spec].filter(Boolean);
  if (docs.some((d) => QUESTION_RE.test(d))) {
    return { step: 'question', reason: 'A > QUESTION block is waiting for Quan.', feature: current?.dir };
  }
  if (!current) return { step: 'idle', reason: 'No open feature. Start one with /next <idea>.' };
  if (!current.grill || parseStatus(current.grill) !== 'done') {
    return { step: 'grill', reason: 'Grill log missing or not marked Status: done.', feature: current.dir };
  }
  if (!current.spec) return { step: 'spec', reason: 'Grill done, no spec yet.', feature: current.dir };
  if (parseStatus(current.spec) !== 'approved' && parseStatus(current.specOnMaster ?? current.spec) !== 'approved') {
    return { step: 'gate-a', reason: 'Spec is a draft. Quan reviews it and sets Status: approved.', feature: current.dir };
  }

  const prs = facts.prs ?? [];
  const needsFeedback = prs.find((p) => p.feedbackAt && (!p.lastCommitAt || p.feedbackAt > p.lastCommitAt));
  if (needsFeedback) {
    return { step: 'feedback', reason: `PR #${needsFeedback.number} has review feedback newer than its last commit.`, feature: current.dir, prs: [needsFeedback] };
  }

  const tasks = parseTasks(current.specOnMaster ?? current.spec);
  const inFlight = (t) => {
    const prefix = taskBranchPrefix(current.dir, t.id);
    return prs.some((p) => p.headRefName?.startsWith(prefix));
  };

  // A branch whose task is already ticked on master was merged (squash merges leave it "ahead"); ignore it.
  const branchTask = tasks.find((t) => facts.branch?.startsWith(taskBranchPrefix(current.dir, t.id)));
  const stale = branchTask?.done ? `You are on ${facts.branch}, whose task is already merged: run "git checkout master" and "git pull" first.` : undefined;
  const onTask = branchTask && !branchTask.done ? branchTask : null;
  if (onTask && !inFlight(onTask)) {
    const branchTasks = parseTasks(current.spec);
    const tickedHere = branchTasks.find((t) => t.id === onTask.id)?.done;
    if (tickedHere && facts.branchAhead && !facts.dirty) {
      return { step: 'pr', reason: `Task ${onTask.id} is finished on ${facts.branch} and has no PR.`, feature: current.dir, task: onTask.id };
    }
    return { step: 'execute', reason: `Continue task ${onTask.id} on ${facts.branch}.`, feature: current.dir, task: onTask.id };
  }

  const withStale = (r) => (stale ? { ...r, cleanup: stale } : r);
  const doneIds = new Set(tasks.filter((t) => t.done).map((t) => t.id));
  const ready = tasks.find((t) => !t.done && !inFlight(t) && t.after.every((d) => doneIds.has(d)));
  if (ready) {
    return withStale({ step: 'execute', reason: `Task ${ready.id} is ready: ${ready.title}`, feature: current.dir, task: ready.id });
  }
  const waiting = prs.filter((p) => tasks.some((t) => !t.done && p.headRefName?.startsWith(taskBranchPrefix(current.dir, t.id))));
  if (tasks.some((t) => !t.done)) {
    return withStale({ step: 'gate-b', reason: 'Every remaining task waits on an open PR (or on a task that does).', feature: current.dir, prs: waiting });
  }
  return withStale({ step: 'done', reason: 'All tasks are merged. Ask Quan for the fit score (1-5 + one sentence) and record it as "Fit score: N — ..." at the end of the spec.', feature: current.dir });
}

// ---------- impure side ----------

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (root, args) => { try { return git(root, args); } catch { return null; } };
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

/** The ref that holds merged truth: the remote default branch when there is one (fetched first), else the local one. */
function defaultBranch(root, { fetch = true } = {}) {
  if (fetch && tryGit(root, ['remote'])) {
    try { execFileSync('git', ['fetch', '-q', 'origin'], { cwd: root, stdio: 'ignore', timeout: 20000 }); } catch { /* offline: use what we have */ }
  }
  const head = tryGit(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head) return head;
  for (const ref of ['origin/master', 'origin/main', 'master', 'main']) {
    if (tryGit(root, ['rev-parse', '--verify', '--quiet', ref])) return ref;
  }
  return 'master';
}

/** Normalise a PR's reviews, conversation comments and inline comments into feedback items (harness's own replies excluded). */
export function feedbackItems(pr, inline = []) {
  return [
    ...(pr.reviews ?? []).filter((r) => r.state !== 'APPROVED' || r.body)
      .map((r) => ({ kind: `review:${r.state}`, at: r.submittedAt, author: r.author?.login, body: r.body ?? '' })),
    ...(pr.comments ?? []).map((c) => ({ kind: 'comment', at: c.createdAt, author: c.author?.login, body: c.body ?? '' })),
    ...inline.map((c) => ({ kind: 'inline', at: c.created_at, author: c.user?.login, body: c.body ?? '', path: c.path, line: c.line ?? c.original_line })),
  ].filter((f) => f.at && !isHarnessComment(f.body)).sort((a, b) => (a.at < b.at ? -1 : 1));
}

export function lastCommitAt(pr) {
  return (pr.commits ?? []).map((c) => c.committedDate).sort().at(-1) ?? null;
}

const gh = (root, args) => execFileSync('gh', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const PR_FIELDS = 'number,title,headRefName,url,commits,reviews,comments';

function inlineComments(root, number) {
  const nameWithOwner = gh(root, ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
  return JSON.parse(gh(root, ['api', `repos/${nameWithOwner}/pulls/${number}/comments`]));
}

export function collectGitHub(root) {
  return JSON.parse(gh(root, ['pr', 'list', '--state', 'open', '--json', PR_FIELDS])).map((p) => {
    const feedback = feedbackItems(p, inlineComments(root, p.number));
    return {
      number: p.number, title: p.title, headRefName: p.headRefName, url: p.url, lastCommitAt: lastCommitAt(p),
      feedbackAt: feedback.at(-1)?.at ?? null,
    };
  });
}

/** Feedback on one PR that is newer than its last commit (i.e. not yet addressed). */
export function fetchUnaddressed(root, number) {
  const p = JSON.parse(gh(root, ['pr', 'view', String(number), '--json', PR_FIELDS]));
  const since = lastCommitAt(p);
  const items = feedbackItems(p, inlineComments(root, number)).filter((f) => !since || f.at > since);
  return { number: p.number, title: p.title, url: p.url, branch: p.headRefName, lastCommitAt: since, items };
}

export function collectFacts(root, { idea = null, github = collectGitHub } = {}) {
  const facts = { harnessProject: fs.existsSync(path.join(root, 'harness.json')), idea, features: [], otherDocs: [], prs: [], ghError: null };
  const base = defaultBranch(root);
  const featuresDir = path.join(root, 'docs', 'features');
  const dirs = fs.existsSync(featuresDir) ? fs.readdirSync(featuresDir).filter((d) => /^\d{3}-/.test(d)).sort() : [];
  for (const dir of dirs) {
    const rel = `docs/features/${dir}`;
    facts.features.push({
      dir,
      grill: readIf(path.join(root, rel, 'grill.md')),
      spec: readIf(path.join(root, rel, 'spec.md')),
      specOnMaster: tryGit(root, ['show', `${base}:${rel}/spec.md`]),
    });
  }
  for (const f of ['product.md', 'decisions.md']) {
    const t = readIf(path.join(root, 'docs', f));
    if (t) facts.otherDocs.push(t);
  }
  facts.branch = tryGit(root, ['branch', '--show-current']) ?? '';
  facts.branchAhead = Number(tryGit(root, ['rev-list', '--count', `${base}..HEAD`]) ?? 0) > 0;
  facts.dirty = (tryGit(root, ['status', '--porcelain']) ?? '') !== '';
  try {
    facts.prs = github(root);
  } catch (e) {
    facts.ghError = String(e.message ?? e).split('\n')[0];
  }
  return facts;
}
