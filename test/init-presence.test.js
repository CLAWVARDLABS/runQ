import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  detectAgentPresence,
  initAgent,
  initClaudeCode,
  initCodex,
  initHermes,
  initOpenClaw
} from '../src/init.js';

const runqRoot = new URL('..', import.meta.url).pathname;

function emptyHome() {
  return mkdtempSync(join(tmpdir(), 'runq-init-presence-'));
}

test('detectAgentPresence reports false for every agent in an empty home', () => {
  const home = emptyHome();
  const presence = detectAgentPresence(home);
  assert.deepEqual(presence, {
    'claude-code': false,
    codex: false,
    openclaw: false,
    hermes: false
  });
});

test('detectAgentPresence reports true only for agents whose home dir exists', () => {
  const home = emptyHome();
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(join(home, '.hermes'), { recursive: true });
  const presence = detectAgentPresence(home);
  assert.deepEqual(presence, {
    'claude-code': true,
    codex: false,
    openclaw: false,
    hermes: true
  });
});

test('initClaudeCode skips without writing when ~/.claude does not exist', () => {
  const home = emptyHome();
  const result = initClaudeCode({ homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'agent-not-installed');
  assert.equal(result.target, 'claude-code');
  assert.equal(existsSync(join(home, '.claude')), false);
  assert.deepEqual(readdirSync(home), []);
});

test('initCodex skips without writing when ~/.codex does not exist', () => {
  const home = emptyHome();
  const result = initCodex({ homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, true);
  assert.equal(existsSync(join(home, '.codex')), false);
  assert.deepEqual(readdirSync(home), []);
});

test('initOpenClaw skips without writing when ~/.openclaw does not exist', () => {
  const home = emptyHome();
  const result = initOpenClaw({ homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, true);
  assert.equal(existsSync(join(home, '.openclaw')), false);
  assert.deepEqual(readdirSync(home), []);
});

test('initHermes skips without writing when ~/.hermes does not exist', () => {
  const home = emptyHome();
  const result = initHermes({ homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, true);
  assert.equal(existsSync(join(home, '.hermes')), false);
  assert.deepEqual(readdirSync(home), []);
});

test('initHermes writes runq.json once ~/.hermes is present', () => {
  const home = emptyHome();
  mkdirSync(join(home, '.hermes'), { recursive: true });
  const result = initHermes({ homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, undefined);
  assert.equal(result.target, 'hermes');
  assert.equal(existsSync(join(home, '.hermes', 'hooks', 'runq.json')), true);
});

test('initAgent("all") only writes for installed agents and reports skipped ones', () => {
  const home = emptyHome();
  // Only Claude Code is "installed" here.
  mkdirSync(join(home, '.claude'), { recursive: true });

  const results = initAgent('all', { homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });

  assert.equal(Array.isArray(results), true);
  const byTarget = Object.fromEntries(results.map((entry) => [entry.target, entry]));

  assert.equal(byTarget['claude-code'].skipped, undefined);
  assert.equal(existsSync(join(home, '.claude', 'settings.local.json')), true);

  for (const target of ['codex', 'openclaw', 'hermes']) {
    assert.equal(byTarget[target].skipped, true, `${target} should be skipped`);
    assert.equal(byTarget[target].reason, 'agent-not-installed');
  }
  assert.equal(existsSync(join(home, '.codex')), false);
  assert.equal(existsSync(join(home, '.openclaw')), false);
  assert.equal(existsSync(join(home, '.hermes')), false);
});

test('initAgent with an explicit single target forces a write even if the agent home is missing', () => {
  // Explicit per-agent init signals user intent ("set this up for me") so we don't refuse.
  const home = emptyHome();
  const result = initAgent('hermes', { homeDir: home, dbPath: join(home, 'runq.db'), runqRoot });
  assert.equal(result.skipped, undefined);
  assert.equal(existsSync(join(home, '.hermes', 'hooks', 'runq.json')), true);
});
