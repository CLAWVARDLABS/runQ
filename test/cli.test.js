import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

test('CLI demo writes a complete local demo database', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'demo.db');

  const result = spawnSync(process.execPath, [
    cliPath,
    'demo',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /created RunQ demo database/);
  assert.match(result.stdout, new RegExp(dbPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(result.stdout, /npm run inbox -- --db/);

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
  assert.equal(rows.length, 4);
  assert.deepEqual(new Set(rows.map((row) => row.framework)), new Set(['openclaw', 'codex', 'claude_code']));

  const exported = spawnSync(process.execPath, [
    cliPath,
    'export',
    'demo-openclaw-needs-review',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });
  assert.equal(exported.status, 0, exported.stderr);
  const bundle = JSON.parse(exported.stdout);
  assert.equal(bundle.recommendations.some((rec) => rec.recommendation_id === 'rec_verification_strategy'), true);
  assert.equal(bundle.recommendations.some((rec) => rec.state.status === 'accepted'), true);
});

test('CLI accept-recommendation records a recommendation.accepted event for the session', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const eventsPath = join(dir, 'events.json');
  writeFileSync(eventsPath, JSON.stringify([
    makeEvent('evt_cli_1', 'session.started', '2026-05-02T10:00:00.000Z'),
    {
      ...makeEvent('evt_cli_file', 'file.changed', '2026-05-02T10:01:00.000Z'),
      payload: { lines_added: 3 }
    },
    makeEvent('evt_cli_2', 'session.ended', '2026-05-02T10:05:00.000Z')
  ]));

  const ingest = spawnSync(process.execPath, [cliPath, 'ingest', eventsPath, '--db', dbPath], { encoding: 'utf8' });
  assert.equal(ingest.status, 0, ingest.stderr);

  const accept = spawnSync(process.execPath, [
    cliPath,
    'accept-recommendation',
    'ses_cli_1',
    'rec_repo_instruction_verification',
    '--note',
    'will document tests',
    '--db',
    dbPath
  ], { encoding: 'utf8' });
  assert.equal(accept.status, 0, accept.stderr);
  assert.match(accept.stdout, /accepted rec_repo_instruction_verification/);

  const exported = spawnSync(process.execPath, [cliPath, 'export', 'ses_cli_1', '--db', dbPath], { encoding: 'utf8' });
  const bundle = JSON.parse(exported.stdout);
  const feedback = bundle.events.find((event) => event.event_type === 'recommendation.accepted');
  assert.ok(feedback, 'recommendation.accepted event should exist');
  assert.equal(feedback.payload.recommendation_id, 'rec_repo_instruction_verification');
  assert.equal(feedback.payload.note, 'will document tests');

  const repo = bundle.recommendations.find((rec) => rec.recommendation_id === 'rec_repo_instruction_verification');
  assert.equal(repo.state.status, 'accepted');
});

test('CLI dismiss-recommendation records a recommendation.dismissed event for the session', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const eventsPath = join(dir, 'events.json');
  writeFileSync(eventsPath, JSON.stringify([
    makeEvent('evt_cli_1', 'session.started', '2026-05-02T10:00:00.000Z'),
    {
      ...makeEvent('evt_cli_file', 'file.changed', '2026-05-02T10:01:00.000Z'),
      payload: { lines_added: 3 }
    },
    makeEvent('evt_cli_2', 'session.ended', '2026-05-02T10:05:00.000Z')
  ]));
  const ingest = spawnSync(process.execPath, [cliPath, 'ingest', eventsPath, '--db', dbPath], { encoding: 'utf8' });
  assert.equal(ingest.status, 0, ingest.stderr);

  const dismiss = spawnSync(process.execPath, [
    cliPath,
    'dismiss-recommendation',
    'ses_cli_1',
    'rec_repo_instruction_verification',
    '--db',
    dbPath
  ], { encoding: 'utf8' });
  assert.equal(dismiss.status, 0, dismiss.stderr);

  const exported = spawnSync(process.execPath, [cliPath, 'export', 'ses_cli_1', '--db', dbPath], { encoding: 'utf8' });
  const bundle = JSON.parse(exported.stdout);
  const repo = bundle.recommendations.find((rec) => rec.recommendation_id === 'rec_repo_instruction_verification');
  assert.equal(repo.state.status, 'dismissed');
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

test('CLI init writes Codex hooks and notify config while preserving existing TOML', () => {
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
  assert.match(config, /\[features\]/);
  assert.match(config, /codex_hooks = true/);
  assert.match(config, /\[\[hooks\.SessionStart\]\]/);
  assert.match(config, /\[\[hooks\.UserPromptSubmit\]\]/);
  assert.match(config, /\[\[hooks\.PreToolUse\]\]/);
  assert.match(config, /\[\[hooks\.PostToolUse\]\]/);
  assert.match(config, /\[\[hooks\.Stop\]\]/);
  assert.match(config, /matcher = "Bash\|apply_patch"/);
  assert.match(config, /--quiet/);
  assert.match(config, /notify = \[/);
  assert.match(config, /adapters\/codex\/hook\.js/);
  assert.equal(config.indexOf('notify = [') < config.indexOf('[features]'), true);
  assert.equal(config.indexOf('[features]') < config.indexOf('[[hooks.SessionStart]]'), true);
});

test('CLI init writes OpenClaw plugin package and enables prompt hook access', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const openclawDir = join(dir, '.openclaw');
  mkdirSync(openclawDir, { recursive: true });
  writeFileSync(join(openclawDir, 'openclaw.json'), JSON.stringify({
    plugins: {
      allow: ['existing-plugin'],
      load: {
        paths: ['/existing/plugin']
      }
    }
  }, null, 2));

  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'openclaw',
    '--home',
    dir,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /configured openclaw/);

  const pluginRoot = join(openclawDir, 'extensions', 'runq-reporter');
  assert.equal(existsSync(join(pluginRoot, 'package.json')), true);
  assert.equal(existsSync(join(pluginRoot, 'openclaw.plugin.json')), true);
  assert.equal(existsSync(join(pluginRoot, 'index.cjs')), true);
  const manifest = JSON.parse(readFileSync(join(pluginRoot, 'openclaw.plugin.json'), 'utf8'));
  assert.equal(manifest.id, 'runq-reporter');
  assert.equal(manifest.configSchema.additionalProperties, false);
  const plugin = readFileSync(join(pluginRoot, 'index.cjs'), 'utf8');
  assert.match(plugin, /spawnSync/);
  assert.match(plugin, /api\.on\("model_call_started"/);
  assert.match(plugin, /api\.on\("model_call_ended"/);
  assert.match(plugin, /api\.on\("llm_input"/);
  assert.doesNotMatch(plugin, /api\.on\("tool_result_persist"/);
  assert.match(plugin, new RegExp(dbPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const config = JSON.parse(readFileSync(join(openclawDir, 'openclaw.json'), 'utf8'));
  assert.equal(config.plugins.enabled, true);
  assert.deepEqual(config.plugins.allow, ['existing-plugin', 'runq-reporter']);
  assert.deepEqual(config.plugins.load.paths, ['/existing/plugin', pluginRoot]);
  assert.equal(config.plugins.entries['runq-reporter'].hooks.allowPromptInjection, true);
  assert.equal('allowConversationAccess' in config.plugins.entries['runq-reporter'].hooks, false);
});

test('CLI init resolves relative database paths before writing agent hooks', () => {
  const dir = tempDir();
  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'all',
    '--home',
    dir,
    '--db',
    '.runq/relative.db'
  ], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const expectedDbPath = resolve(new URL('..', import.meta.url).pathname, '.runq/relative.db');
  const openclawPlugin = readFileSync(join(dir, '.openclaw', 'extensions', 'runq-reporter', 'index.cjs'), 'utf8');
  const codexConfig = readFileSync(join(dir, '.codex', 'config.toml'), 'utf8');
  const hermesManifest = JSON.parse(readFileSync(join(dir, '.hermes', 'hooks', 'runq.json'), 'utf8'));
  assert.match(openclawPlugin, new RegExp(expectedDbPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(codexConfig, new RegExp(expectedDbPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.deepEqual(hermesManifest.command.slice(-2), ['--db', expectedDbPath]);
});

test('CLI init writes Hermes hook command manifest', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'hermes',
    '--home',
    dir,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /configured hermes/);

  const manifestPath = join(dir, '.hermes', 'hooks', 'runq.json');
  assert.equal(existsSync(manifestPath), true);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'runq');
  assert.deepEqual(manifest.command.slice(0, 3), ['node', manifest.command[1], '--db']);
  assert.match(manifest.command[1], /adapters\/hermes\/hook\.js/);
  assert.equal(manifest.command[3], dbPath);
  assert.equal(manifest.events.includes('command.finished'), true);
});

test('CLI init all configures every supported local agent surface', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    cliPath,
    'init',
    'all',
    '--home',
    dir,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /configured claude-code/);
  assert.match(result.stdout, /configured codex/);
  assert.match(result.stdout, /configured openclaw/);
  assert.match(result.stdout, /configured hermes/);
  assert.equal(existsSync(join(dir, '.claude', 'settings.local.json')), true);
  assert.equal(existsSync(join(dir, '.codex', 'config.toml')), true);
  assert.equal(existsSync(join(dir, '.openclaw', 'extensions', 'runq-reporter', 'index.cjs')), true);
  assert.equal(existsSync(join(dir, '.hermes', 'hooks', 'runq.json')), true);
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

test('CLI import-openclaw converts OpenClaw message tool calls and uses the last assistant event', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const sessionPath = join(dir, 'openclaw-message-tools.jsonl');
  writeFileSync(sessionPath, [
    JSON.stringify({ type: 'session', id: 'openclaw-message-tools', timestamp: '2026-05-03T01:00:00.000Z', cwd: '/repo/app' }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:01.000Z', message: { role: 'user', content: [{ type: 'text', text: 'Run tests' }] } }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:02.000Z', message: { role: 'assistant', provider: 'clawvard-token', model: 'MiniMax-M2.7', content: [{ type: 'toolCall', id: 'call-1', name: 'exec', arguments: { command: 'npm test' } }], usage: { input: 100, output: 20, totalTokens: 120 }, stopReason: 'toolUse' } }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:04.000Z', message: { role: 'toolResult', toolCallId: 'call-1', toolName: 'exec', details: { exitCode: 1, durationMs: 2000, aggregated: '1 failing test' } } }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:10:00.000Z', message: { role: 'assistant', provider: 'clawvard-token', model: 'MiniMax-M2.7', content: [{ type: 'text', text: 'Request was aborted' }], usage: { input: 200, output: 5, totalTokens: 205 }, stopReason: 'aborted', errorMessage: 'Request was aborted' } })
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
    'openclaw-message-tools',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });
  const bundle = JSON.parse(exported.stdout);
  assert.equal(bundle.events.some((event) => event.event_type === 'command.started'), true);
  assert.equal(bundle.events.some((event) => event.event_type === 'command.ended' && event.payload.exit_code === 1), true);
  assert.equal(bundle.events.find((event) => event.event_type === 'session.ended')?.payload.duration_ms, 600000);
  assert.equal(bundle.events.find((event) => event.event_type === 'model.call.ended')?.payload.total_tokens, 205);
});
