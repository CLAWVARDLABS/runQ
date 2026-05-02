import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { normalizeClaudeCodeHook } from '../adapters/claude-code/normalize.js';
import { RunqStore } from '../src/store.js';

const hookPath = new URL('../adapters/claude-code/hook.js', import.meta.url).pathname;

test('normalizeClaudeCodeHook maps SessionStart to session.started', () => {
  const [event] = normalizeClaudeCodeHook({
    session_id: 'claude-session-1',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/repo/app',
    hook_event_name: 'SessionStart',
    source: 'startup',
    model: 'claude-sonnet-4-6'
  }, {
    now: '2026-05-02T12:00:00.000Z'
  });

  assert.equal(event.event_type, 'session.started');
  assert.equal(event.session_id, 'claude-session-1');
  assert.equal(event.run_id, 'claude-session-1');
  assert.equal(event.framework, 'claude_code');
  assert.equal(event.source, 'hook');
  assert.equal(event.privacy.level, 'metadata');
  assert.equal(event.payload.agent_name, 'Claude Code');
  assert.equal(event.payload.model, 'claude-sonnet-4-6');
});

test('normalizeClaudeCodeHook maps UserPromptSubmit to redacted prompt summary event', () => {
  const [event] = normalizeClaudeCodeHook({
    session_id: 'claude-session-1',
    cwd: '/repo/app',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'Please add tests for the RunQ schema validator and keep it dependency-free.'
  }, {
    now: '2026-05-02T12:01:00.000Z'
  });

  assert.equal(event.event_type, 'user.prompt.submitted');
  assert.equal(event.privacy.level, 'summary');
  assert.equal(event.privacy.redacted, true);
  assert.equal(event.payload.prompt_length, 75);
  assert.match(event.payload.prompt_hash, /^sha256:/);
  assert.equal(event.payload.prompt_summary, 'Please add tests for the RunQ schema validator and keep it dependency-free.');
});

test('normalizeClaudeCodeHook maps Bash PreToolUse and PostToolUse to command events', () => {
  const [started] = normalizeClaudeCodeHook({
    session_id: 'claude-session-1',
    cwd: '/repo/app',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_use_id: 'toolu_123',
    tool_input: {
      command: 'npm test -- test/schema.test.js'
    }
  }, {
    now: '2026-05-02T12:02:00.000Z'
  });

  const [ended] = normalizeClaudeCodeHook({
    session_id: 'claude-session-1',
    cwd: '/repo/app',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_use_id: 'toolu_123',
    tool_input: {
      command: 'npm test -- test/schema.test.js'
    },
    tool_response: {
      stdout: 'ok',
      stderr: '',
      interrupted: false
    }
  }, {
    now: '2026-05-02T12:03:00.000Z'
  });

  assert.equal(started.event_type, 'command.started');
  assert.equal(started.payload.command_id, 'toolu_123');
  assert.equal(started.payload.binary, 'npm');
  assert.equal(started.payload.is_verification, true);
  assert.equal(started.privacy.level, 'metadata');

  assert.equal(ended.event_type, 'command.ended');
  assert.equal(ended.payload.command_id, 'toolu_123');
  assert.equal(ended.payload.exit_code, 0);
  assert.equal(ended.payload.stdout_hash.startsWith('sha256:'), true);
});

test('Claude Code hook command reads stdin and appends normalized events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-claude-hook-'));
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    hookPath,
    '--db',
    dbPath
  ], {
    input: JSON.stringify({
      session_id: 'claude-session-hook',
      cwd: '/repo/app',
      hook_event_name: 'SessionEnd',
      reason: 'other'
    }),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /recorded 1 RunQ events/);

  const store = new RunqStore(dbPath);
  const events = store.listEventsForSession('claude-session-hook');
  store.close();

  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, 'session.ended');
  assert.equal(events[0].payload.ended_reason, 'other');
});
