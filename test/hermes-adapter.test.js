import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { normalizeHermesEvent } from '../adapters/hermes/normalize.js';
import { RunqStore } from '../src/store.js';

const hookPath = new URL('../adapters/hermes/hook.js', import.meta.url).pathname;

test('normalizeHermesEvent maps session lifecycle events', () => {
  const [started] = normalizeHermesEvent({
    type: 'session.started',
    session_id: 'hermes-session-1',
    run_id: 'hermes-run-1',
    cwd: '/repo/app',
    agent: 'hermes-dev',
    model: 'hermes-model'
  }, {
    now: '2026-05-03T07:00:00.000Z'
  });

  const [ended] = normalizeHermesEvent({
    type: 'session.ended',
    session_id: 'hermes-session-1',
    run_id: 'hermes-run-1',
    success: true,
    duration_ms: 1200
  }, {
    now: '2026-05-03T07:00:02.000Z'
  });

  assert.equal(started.event_type, 'session.started');
  assert.equal(started.framework, 'hermes');
  assert.equal(started.payload.agent_name, 'hermes-dev');
  assert.equal(started.payload.model, 'hermes-model');
  assert.equal(ended.event_type, 'session.ended');
  assert.equal(ended.payload.success, true);
});

test('normalizeHermesEvent maps command events', () => {
  const [event] = normalizeHermesEvent({
    type: 'command.finished',
    session_id: 'hermes-session-1',
    run_id: 'hermes-run-1',
    command_id: 'cmd-1',
    command: 'npm test',
    exit_code: 0,
    stdout: 'ok',
    stderr: '',
    duration_ms: 900
  }, {
    now: '2026-05-03T07:00:03.000Z'
  });

  assert.equal(event.event_type, 'command.ended');
  assert.equal(event.payload.binary, 'npm');
  assert.equal(event.payload.exit_code, 0);
  assert.equal(event.payload.is_verification, true);
});

test('Hermes hook command reads stdin and appends normalized events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-hermes-hook-'));
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    hookPath,
    '--db',
    dbPath
  ], {
    input: JSON.stringify({
      type: 'session.ended',
      session_id: 'hermes-session-hook',
      success: false,
      error: 'failed'
    }),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /recorded 1 RunQ events/);

  const store = new RunqStore(dbPath);
  const events = store.listEventsForSession('hermes-session-hook');
  store.close();

  assert.equal(events.length, 1);
  assert.equal(events[0].framework, 'hermes');
  assert.equal(events[0].payload.ended_reason, 'error');
});
