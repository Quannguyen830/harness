#!/usr/bin/env node
// Prints the step /next should run, as JSON (spec §4.2).
// Usage: node next-state.mjs [--root <dir>] [--idea "<text>"]
import { collectFacts, decide } from './lib/state.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const root = opt('--root') ?? process.cwd();
const idea = opt('--idea');

const facts = collectFacts(root, { idea: idea && idea.trim() ? idea.trim() : null });
const result = decide(facts);
console.log(JSON.stringify(result, null, 2));
