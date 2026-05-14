import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getPrivacyMode, setPrivacyMode, DEFAULT_PRIVACY_MODE } from '../src/config.js';

function freshRunqDir() {
  const root = mkdtempSync(join(tmpdir(), 'runq-config-'));
  const runqDir = join(root, '.runq');
  mkdirSync(runqDir, { recursive: true });
  return runqDir;
}

test('getPrivacyMode defaults to off when no config file exists', () => {
  const runqDir = freshRunqDir();
  assert.equal(getPrivacyMode(runqDir), DEFAULT_PRIVACY_MODE);
  assert.equal(getPrivacyMode(runqDir), 'off');
});

test('setPrivacyMode persists to .runq/config.json and round-trips through getPrivacyMode', () => {
  const runqDir = freshRunqDir();
  setPrivacyMode('on', runqDir);
  assert.equal(getPrivacyMode(runqDir), 'on');

  const raw = readFileSync(join(runqDir, 'config.json'), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.privacyMode, 'on');

  setPrivacyMode('off', runqDir);
  assert.equal(getPrivacyMode(runqDir), 'off');
});

test('setPrivacyMode rejects invalid modes by falling back to default', () => {
  const runqDir = freshRunqDir();
  const result = setPrivacyMode('garbage', runqDir);
  assert.equal(result, 'off');
  assert.equal(getPrivacyMode(runqDir), 'off');
});

test('getPrivacyMode tolerates corrupted config files', () => {
  const runqDir = freshRunqDir();
  writeFileSync(join(runqDir, 'config.json'), '{not json');
  assert.equal(getPrivacyMode(runqDir), DEFAULT_PRIVACY_MODE);
});

test('config helpers accept a db path inside .runq/ as hint', () => {
  const runqDir = freshRunqDir();
  const dbPath = join(runqDir, 'runq.db');
  setPrivacyMode('on', dbPath);
  assert.equal(getPrivacyMode(dbPath), 'on');
});
