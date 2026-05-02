import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { normalizeCodexHook } from '../adapters/codex/normalize.js';
import { RunqStore } from '../src/store.js';

const hookPath = new URL('../adapters/codex/hook.js', import.meta.url).pathname;

test('normalizeCodexHook maps SessionStart to session.started', () => {
  const [event] = normalizeCodexHook({
    session_id: 'codex-session-1',
    cwd: '/repo/app',
    hook_event_name: 'SessionStart',
    model: 'gpt-5.2-codex',
    agent_type: 'default'
  }, {
    now: '2026-05-02T13:00:00.000Z'
  });

  assert.equal(event.event_type, 'session.started');
  assert.equal(event.session_id, 'codex-session-1');
  assert.equal(event.framework, 'codex');
  assert.equal(event.payload.agent_name, 'Codex');
  assert.equal(event.payload.model, 'gpt-5.2-codex');
});

test('normalizeCodexHook maps UserPromptSubmit to user.prompt.submitted', () => {
  const [event] = normalizeCodexHook({
    session_id: 'codex-session-1',
    cwd: '/repo/app',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'Add a local SQLite collector for RunQ events.'
  }, {
    now: '2026-05-02T13:01:00.000Z'
  });

  assert.equal(event.event_type, 'user.prompt.submitted');
  assert.equal(event.privacy.level, 'summary');
  assert.equal(event.payload.prompt_length, 45);
  assert.match(event.payload.prompt_hash, /^sha256:/);
});

test('normalizeCodexHook maps shell tool hooks to command events', () => {
  const [started] = normalizeCodexHook({
    session_id: 'codex-session-1',
    cwd: '/repo/app',
    hook_event_name: 'PreToolUse',
    tool_name: 'shell',
    tool_use_id: 'call_123',
    tool_input: {
      command: 'node --test'
    }
  }, {
    now: '2026-05-02T13:02:00.000Z'
  });

  const [ended] = normalizeCodexHook({
    session_id: 'codex-session-1',
    cwd: '/repo/app',
    hook_event_name: 'PostToolUse',
    tool_name: 'shell',
    tool_use_id: 'call_123',
    tool_input: {
      command: 'node --test'
    },
    tool_response: {
      exit_code: 0,
      stdout: 'pass',
      stderr: ''
    }
  }, {
    now: '2026-05-02T13:03:00.000Z'
  });

  assert.equal(started.event_type, 'command.started');
  assert.equal(started.payload.binary, 'node');
  assert.equal(started.payload.is_verification, true);
  assert.equal(ended.event_type, 'command.ended');
  assert.equal(ended.payload.exit_code, 0);
});

test('normalizeCodexHook maps legacy notify agent-turn-complete to session.ended', () => {
  const [event] = normalizeCodexHook({
    type: 'agent-turn-complete',
    'turn-id': 'turn_123',
    'input-messages': ['Fix schema validation'],
    'last-assistant-message': 'Implemented and verified tests pass.',
    cwd: '/repo/app'
  }, {
    now: '2026-05-02T13:04:00.000Z'
  });

  assert.equal(event.event_type, 'session.ended');
  assert.equal(event.session_id, 'turn_123');
  assert.equal(event.payload.ended_reason, 'agent-turn-complete');
  assert.match(event.payload.last_assistant_message_hash, /^sha256:/);
});

test('Codex hook command reads stdin and appends normalized events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-codex-hook-'));
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    hookPath,
    '--db',
    dbPath
  ], {
    input: JSON.stringify({
      session_id: 'codex-session-hook',
      cwd: '/repo/app',
      hook_event_name: 'SessionEnd',
      reason: 'other'
    }),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /recorded 1 RunQ events/);

  const store = new RunqStore(dbPath);
  const events = store.listEventsForSession('codex-session-hook');
  store.close();

  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, 'session.ended');
});
