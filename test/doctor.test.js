import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { checkSetupHealth } from '../src/doctor.js';

const cliPath = new URL('../src/cli.js', import.meta.url).pathname;
const runqRoot = new URL('..', import.meta.url).pathname;

test('checkSetupHealth reports configured Claude Code, Codex, OpenClaw, and Hermes surfaces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-'));
  mkdirSync(join(dir, '.claude'), { recursive: true });
  mkdirSync(join(dir, '.codex'), { recursive: true });
  mkdirSync(join(dir, '.openclaw', 'agents', 'main', 'sessions'), { recursive: true });
  mkdirSync(join(dir, '.openclaw', 'extensions', 'runq-reporter'), { recursive: true });
  mkdirSync(join(dir, '.hermes', 'hooks'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'settings.local.json'), JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ command: 'node /repo/runq/adapters/claude-code/hook.js --db /tmp/runq.db' }] }]
    }
  }));
  writeFileSync(join(dir, '.codex', 'config.toml'), 'notify = ["node", "/repo/runq/adapters/codex/hook.js"]\n');
  writeFileSync(join(dir, '.openclaw', 'agents', 'main', 'sessions', 's1.jsonl'), '{}\n');
  writeFileSync(join(dir, '.openclaw', 'extensions', 'runq-reporter', 'index.cjs'), 'api.on("llm_input", () => {})\n');
  writeFileSync(join(dir, '.openclaw', 'openclaw.json'), JSON.stringify({
    plugins: {
      allow: ['runq-reporter'],
      load: { paths: [join(dir, '.openclaw', 'extensions', 'runq-reporter')] },
      entries: {
        'runq-reporter': {
          hooks: { allowPromptInjection: true }
        }
      }
    }
  }));
  writeFileSync(join(dir, '.hermes', 'hooks', 'runq.json'), JSON.stringify({
    command: ['node', '/repo/runq/adapters/hermes/hook.js', '--db', '/tmp/runq.db']
  }));

  const health = checkSetupHealth({
    homeDir: dir,
    runqRoot,
    dbPath: join(dir, 'runq.db')
  });

  assert.equal(health.ok, true);
  assert.equal(health.checks.find((check) => check.id === 'node')?.agent_id, undefined);
  assert.equal(health.checks.find((check) => check.id === 'database')?.agent_id, undefined);
  assert.equal(health.checks.find((check) => check.id === 'claude-code')?.agent_id, 'claude_code');
  assert.equal(health.checks.find((check) => check.id === 'claude-code')?.status, 'ok');
  assert.equal(health.checks.find((check) => check.id === 'codex')?.agent_id, 'codex');
  assert.equal(health.checks.find((check) => check.id === 'codex')?.status, 'ok');
  assert.equal(health.checks.find((check) => check.id === 'openclaw')?.agent_id, 'openclaw');
  assert.equal(health.checks.find((check) => check.id === 'openclaw')?.status, 'ok');
  assert.match(health.checks.find((check) => check.id === 'openclaw')?.summary, /Native plugin configured/);
  assert.equal(health.checks.find((check) => check.id === 'hermes')?.agent_id, 'hermes');
  assert.equal(health.checks.find((check) => check.id === 'hermes')?.status, 'ok');
});

test('CLI doctor prints setup health JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-cli-'));
  const result = spawnSync(process.execPath, [
    cliPath,
    'doctor',
    '--home',
    dir,
    '--json'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const health = JSON.parse(result.stdout);
  assert.equal(Array.isArray(health.checks), true);
  assert.equal(health.checks.some((check) => check.id === 'node'), true);
  assert.match(health.checks.find((check) => check.id === 'claude-code')?.remediation, /init claude-code/);
});

test('CLI doctor prints remediation hints for failed checks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-cli-text-'));
  const result = spawnSync(process.execPath, [
    cliPath,
    'doctor',
    '--home',
    dir
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RunQ setup health: needs attention/);
  assert.match(result.stdout, /Fix: node src\/cli\.js init claude-code/);
});
