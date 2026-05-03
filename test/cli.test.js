import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const cliPath = new URL('../src/cli.js', import.meta.url).pathname;

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'runq-cli-'));
}

function makeEvent(id, eventType, timestamp) {
  return {
    runq_version: '0.1.0',
    event_id: id,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: 'ses_cli_1',
    run_id: 'run_cli_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {}
  };
}

test('CLI ingests a JSON event array and lists sessions', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const eventsPath = join(dir, 'events.json');
  writeFileSync(eventsPath, JSON.stringify([
    makeEvent('evt_cli_1', 'session.started', '2026-05-02T10:00:00.000Z'),
    makeEvent('evt_cli_2', 'session.ended', '2026-05-02T10:05:00.000Z')
  ]));

  const ingest = spawnSync(process.execPath, [
    cliPath,
    'ingest',
    eventsPath,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(ingest.status, 0, ingest.stderr);
  assert.match(ingest.stdout, /ingested 2 events/);

  const sessions = spawnSync(process.execPath, [
    cliPath,
    'sessions',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(sessions.status, 0, sessions.stderr);
  const rows = JSON.parse(sessions.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].session_id, 'ses_cli_1');
  assert.equal(rows[0].event_count, 2);
});

test('CLI prints an error for unknown commands', () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    'unknown'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown command: unknown/);
});

test('CLI exports a session bundle as JSON', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const eventsPath = join(dir, 'events.json');
  writeFileSync(eventsPath, JSON.stringify([
    makeEvent('evt_cli_1', 'session.started', '2026-05-02T10:00:00.000Z'),
    makeEvent('evt_cli_2', 'session.ended', '2026-05-02T10:05:00.000Z')
  ]));

  const ingest = spawnSync(process.execPath, [
    cliPath,
    'ingest',
    eventsPath,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });
  assert.equal(ingest.status, 0, ingest.stderr);

  const exported = spawnSync(process.execPath, [
    cliPath,
    'export',
    'ses_cli_1',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(exported.status, 0, exported.stderr);
  const bundle = JSON.parse(exported.stdout);
  assert.equal(bundle.session_id, 'ses_cli_1');
  assert.equal(bundle.events.length, 2);
  assert.equal(bundle.quality.outcome_confidence >= 0, true);
  assert.equal(Array.isArray(bundle.recommendations), true);
});

test('CLI init writes Claude Code hook settings without overwriting existing hooks', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'claude-code',
    '--home',
    dir,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /configured claude-code/);

  const settingsPath = join(dir, '.claude', 'settings.local.json');
  assert.equal(existsSync(settingsPath), true);
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  assert.equal(settings.hooks.SessionStart[0].hooks[0].type, 'command');
  assert.match(settings.hooks.SessionStart[0].hooks[0].command, /adapters\/claude-code\/hook\.js/);
  assert.match(settings.hooks.SessionStart[0].hooks[0].command, new RegExp(dbPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('CLI init writes Codex notify config while preserving existing TOML', () => {
  const dir = tempDir();
  const codexDir = join(dir, '.codex');
  const dbPath = join(dir, 'runq.db');
  mkdirSync(codexDir, { recursive: true });
  writeFileSync(join(codexDir, 'config.toml'), 'model = "gpt-5.2-codex"\n', { flag: 'w' });

  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'codex',
    '--home',
    dir,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const config = readFileSync(join(codexDir, 'config.toml'), 'utf8');
  assert.match(config, /model = "gpt-5\.2-codex"/);
  assert.match(config, /notify = \[/);
  assert.match(config, /adapters\/codex\/hook\.js/);
});

test('CLI import-openclaw converts a session jsonl into RunQ events', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const sessionPath = join(dir, 'openclaw.jsonl');
  writeFileSync(sessionPath, [
    JSON.stringify({ type: 'session', id: 'openclaw-real-1', timestamp: '2026-05-03T01:00:00.000Z', cwd: '/repo/app' }),
    JSON.stringify({ type: 'model_change', timestamp: '2026-05-03T01:00:00.010Z', provider: 'clawvard-token', modelId: 'MiniMax-M2.7' }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:00.020Z', message: { role: 'user', content: [{ type: 'text', text: 'Say ok' }] } }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:01.000Z', message: { role: 'assistant', provider: 'clawvard-token', model: 'MiniMax-M2.7', content: [{ type: 'text', text: 'ok' }], usage: { input: 10, output: 1, totalTokens: 11 }, stopReason: 'stop' } })
  ].join('\n'));

  const result = spawnSync(process.execPath, [
    cliPath,
    'import-openclaw',
    sessionPath,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /imported 7 events/);

  const sessions = spawnSync(process.execPath, [
    cliPath,
    'sessions',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });
  const rows = JSON.parse(sessions.stdout);
  assert.equal(rows[0].session_id, 'openclaw-real-1');
  assert.equal(rows[0].event_count, 7);
});

test('CLI import-openclaw converts OpenClaw tool rows into command timeline events', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const sessionPath = join(dir, 'openclaw-tools.jsonl');
  writeFileSync(sessionPath, [
    JSON.stringify({ type: 'session', id: 'openclaw-real-tools', timestamp: '2026-05-03T01:00:00.000Z', cwd: '/repo/app' }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:00.020Z', message: { role: 'user', content: [{ type: 'text', text: 'Run tests' }] } }),
    JSON.stringify({ type: 'tool_call', timestamp: '2026-05-03T01:00:00.500Z', id: 'tool-1', name: 'system.run', params: { command: 'npm test' } }),
    JSON.stringify({ type: 'tool_result', timestamp: '2026-05-03T01:00:04.000Z', toolCallId: 'tool-1', name: 'system.run', params: { command: 'npm test' }, result: { exitCode: 1, stderr: '1 failing test' }, durationMs: 3500 }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:05.000Z', message: { role: 'assistant', provider: 'clawvard-token', model: 'MiniMax-M2.7', content: [{ type: 'text', text: 'tests failed' }], usage: { input: 10, output: 2, totalTokens: 12 }, stopReason: 'stop' } })
  ].join('\n'));

  const result = spawnSync(process.execPath, [
    cliPath,
    'import-openclaw',
    sessionPath,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);

  const exported = spawnSync(process.execPath, [
    cliPath,
    'export',
    'openclaw-real-tools',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });
  const bundle = JSON.parse(exported.stdout);
  assert.equal(bundle.events.some((event) => event.event_type === 'command.started'), true);
  assert.equal(bundle.events.some((event) => event.event_type === 'command.ended' && event.payload.exit_code === 1), true);
  assert.equal(bundle.quality.reasons.includes('verification_failed_at_end'), true);
});
