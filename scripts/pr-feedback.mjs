#!/usr/bin/env node
// Prints the review feedback on a PR that is newer than its last commit, as JSON.
// Usage: node pr-feedback.mjs <pr-number> [--root <dir>]
import { fetchUnaddressed } from './lib/state.mjs';

const args = process.argv.slice(2);
const i = args.indexOf('--root');
const root = i >= 0 ? args.splice(i, 2)[1] : process.cwd();
const number = Number(args[0]);
if (!number) { console.error('usage: pr-feedback.mjs <pr-number> [--root dir]'); process.exit(2); }
console.log(JSON.stringify(fetchUnaddressed(root, number), null, 2));
