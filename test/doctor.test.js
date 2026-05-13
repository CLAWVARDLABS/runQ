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
  writeFileSync(join(dir, '.codex', 'config.toml'), [
    '[features]',
    'codex_hooks = true',
    '',
    ...['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop'].flatMap((hookName) => [
      `[[hooks.${hookName}]]`,
      `[[hooks.${hookName}.hooks]]`,
      'type = "command"',
      'command = "node /repo/runq/adapters/codex/hook.js --db /tmp/runq.db --quiet"',
      ''
    ]),
    ''
  ].join('\n'));
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
  assert.match(health.checks.find((check) => check.id === 'codex')?.summary, /Codex hooks configured/);
  assert.equal(health.checks.find((check) => check.id === 'openclaw')?.agent_id, 'openclaw');
  assert.equal(health.checks.find((check) => check.id === 'openclaw')?.status, 'ok');
  assert.match(health.checks.find((check) => check.id === 'openclaw')?.summary, /Native plugin configured/);
  assert.equal(health.checks.find((check) => check.id === 'hermes')?.agent_id, 'hermes');
  assert.equal(health.checks.find((check) => check.id === 'hermes')?.status, 'ok');
});

test('CLI doctor prints setup health JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-cli-'));
  // Install Claude Code but not its RunQ hook, to exercise the remediation branch.
  mkdirSync(join(dir, '.claude'), { recursive: true });
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

test('checkSetupHealth reports legacy Codex notify config as manual upgrade', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-codex-notify-'));
  mkdirSync(join(dir, '.codex'), { recursive: true });
  writeFileSync(join(dir, '.codex', 'config.toml'), 'notify = ["node", "/repo/runq/adapters/codex/hook.js"]\n');

  const health = checkSetupHealth({
    homeDir: dir,
    runqRoot,
    dbPath: join(dir, 'runq.db')
  });
  const codex = health.checks.find((check) => check.id === 'codex');

  assert.equal(codex?.status, 'manual');
  assert.match(codex?.summary, /Legacy Codex notify hook configured/);
  assert.match(codex?.remediation, /init codex/);
});

test('checkSetupHealth reports partial Codex hooks config as manual upgrade', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-codex-partial-'));
  mkdirSync(join(dir, '.codex'), { recursive: true });
  writeFileSync(join(dir, '.codex', 'config.toml'), [
    '[features]',
    'codex_hooks = true',
    '',
    '[[hooks.SessionStart]]',
    '[[hooks.SessionStart.hooks]]',
    'type = "command"',
    'command = "node /repo/runq/adapters/codex/hook.js --db /tmp/runq.db --quiet"',
    ''
  ].join('\n'));

  const health = checkSetupHealth({
    homeDir: dir,
    runqRoot,
    dbPath: join(dir, 'runq.db')
  });
  const codex = health.checks.find((check) => check.id === 'codex');

  assert.equal(codex?.status, 'manual');
  assert.match(codex?.summary, /Codex RunQ hooks are incomplete/);
});

test('CLI doctor prints remediation hints for failed checks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-cli-text-'));
  // Install Claude Code (so it's not 'absent') but leave the RunQ hook missing
  // so the doctor surfaces a remediation hint.
  mkdirSync(join(dir, '.claude'), { recursive: true });
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

test('checkSetupHealth marks uninstalled agents as absent without failing the overall rollup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-doctor-absent-'));
  const health = checkSetupHealth({
    homeDir: dir,
    runqRoot,
    dbPath: join(dir, 'runq.db')
  });

  assert.equal(health.ok, true, 'absent agents should not flip overall ok=false');
  for (const id of ['claude-code', 'codex', 'openclaw', 'hermes']) {
    const check = health.checks.find((entry) => entry.id === id);
    assert.equal(check?.status, 'absent', `${id} should be absent on an empty home`);
    assert.equal(check?.remediation, null, `${id} absent check should not surface a remediation`);
  }
});
