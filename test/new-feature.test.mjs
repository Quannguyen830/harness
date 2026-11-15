import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { slugify, nextNumber, createFeature } from '../scripts/new-feature.mjs';

test('slugify keeps five ascii words, strips Vietnamese marks', () => {
  assert.equal(slugify('Theo dõi thói quen hằng ngày của tôi nhé'), 'theo-doi-thoi-quen-hang');
  assert.equal(slugify('Add CSV export!'), 'add-csv-export');
  assert.equal(slugify('!!!'), 'feature');
});

test('nextNumber continues after the highest folder', () => {
  assert.equal(nextNumber([]), '001');
  assert.equal(nextNumber(['001-a', '007-b', 'notes.md']), '008');
});

test('createFeature writes grill.md from the template', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-nf-'));
  const r = createFeature(root, 'Habit tracker\nwith streaks', { date: '2026-11-15', templateDir: path.resolve('templates') });
  assert.equal(r.dir, '001-habit-tracker-with-streaks');
  const text = fs.readFileSync(r.grill, 'utf8');
  assert.match(text, /^# Grill: Habit tracker$/m);
  assert.match(text, /^Status: in-progress$/m);
  assert.match(text, /^Started: 2026-11-15$/m);
  assert.equal(createFeature(root, 'second', { templateDir: path.resolve('templates') }).dir, '002-second');
});
