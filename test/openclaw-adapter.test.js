import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { normalizeOpenClawEvent } from '../adapters/openclaw/normalize.js';
import { RunqStore } from '../src/store.js';

const hookPath = new URL('../adapters/openclaw/hook.js', import.meta.url).pathname;

test('normalizeOpenClawEvent maps session_start hook to session.started', () => {
  const [event] = normalizeOpenClawEvent({
    hook: 'session_start',
    event: {
      sessionId: 'openclaw-session-1',
      sessionKey: 'telegram:thread:42'
    },
    ctx: {
      agentId: 'devbot',
      sessionId: 'openclaw-session-1',
      workspaceDir: '/repo/app'
    }
  }, {
    now: '2026-05-03T01:00:00.000Z'
  });

  assert.equal(event.event_type, 'session.started');
  assert.equal(event.session_id, 'openclaw-session-1');
  assert.equal(event.run_id, 'openclaw-session-1');
  assert.equal(event.framework, 'openclaw');
  assert.equal(event.payload.agent_name, 'devbot');
  assert.equal(event.payload.session_key_hash.startsWith('sha256:'), true);
});

test('normalizeOpenClawEvent maps llm hooks to model call events', () => {
  const [started] = normalizeOpenClawEvent({
    hook: 'llm_input',
    event: {
      runId: 'run-openclaw-1',
      sessionId: 'openclaw-session-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      prompt: 'Fix the failing checkout test',
      historyMessages: [{ role: 'user', content: 'hello' }],
      imagesCount: 0
    },
    ctx: {
      agentId: 'devbot',
      workspaceDir: '/repo/app'
    }
  }, {
    now: '2026-05-03T01:01:00.000Z'
  });

  const [ended] = normalizeOpenClawEvent({
    hook: 'llm_output',
    event: {
      runId: 'run-openclaw-1',
      sessionId: 'openclaw-session-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      assistantTexts: ['I will inspect the failing test.'],
      usage: {
        input: 1200,
        output: 240,
        total: 1440
      }
    },
    ctx: {
      agentId: 'devbot',
      workspaceDir: '/repo/app'
    }
  }, {
    now: '2026-05-03T01:02:00.000Z'
  });

  assert.equal(started.event_type, 'model.call.started');
  assert.equal(started.payload.prompt_length, 29);
  assert.equal(started.payload.history_messages_count, 1);
  assert.equal(ended.event_type, 'model.call.ended');
  assert.equal(ended.payload.input_tokens, 1200);
  assert.equal(ended.payload.output_tokens, 240);
});

test('normalizeOpenClawEvent maps OpenClaw model_call hooks to model call events', () => {
  const [started] = normalizeOpenClawEvent({
    hook: 'model_call_started',
    event: {
      runId: 'run-openclaw-latest',
      sessionId: 'openclaw-session-latest',
      callId: 'call_123',
      provider: 'openai-compatible',
      model: 'MiniMax-M2.7',
      api: 'chat.completions',
      transport: 'stream'
    },
    ctx: {
      agentId: 'devbot',
      workspaceDir: '/repo/app'
    }
  }, {
    now: '2026-05-03T01:01:00.000Z'
  });

  const [ended] = normalizeOpenClawEvent({
    hook: 'model_call_ended',
    event: {
      runId: 'run-openclaw-latest',
      sessionId: 'openclaw-session-latest',
      callId: 'call_123',
      provider: 'openai-compatible',
      model: 'MiniMax-M2.7',
      api: 'chat.completions',
      transport: 'stream',
      outcome: 'completed',
      durationMs: 1234,
      requestPayloadBytes: 1024,
      responseStreamBytes: 2048,
      timeToFirstByteMs: 321
    },
    ctx: {
      agentId: 'devbot',
      workspaceDir: '/repo/app'
    }
  }, {
    now: '2026-05-03T01:02:00.000Z'
  });

  assert.equal(started.event_type, 'model.call.started');
  assert.equal(started.payload.provider, 'openai-compatible');
  assert.equal(started.payload.model, 'MiniMax-M2.7');
  assert.equal(started.payload.call_id_hash.startsWith('sha256:'), true);
  assert.equal(started.payload.api, 'chat.completions');
  assert.equal(ended.event_type, 'model.call.ended');
  assert.equal(ended.payload.duration_ms, 1234);
  assert.equal(ended.payload.outcome, 'completed');
  assert.equal(ended.payload.response_stream_bytes, 2048);
});

test('normalizeOpenClawEvent maps system.run tool hooks to command events', () => {
  const [started] = normalizeOpenClawEvent({
    hook: 'before_tool_call',
    event: {
      toolName: 'system.run',
      toolCallId: 'toolu_123',
      runId: 'run-openclaw-1',
      params: {
        command: 'pnpm test'
      }
    },
    ctx: {
      sessionId: 'openclaw-session-1',
      runId: 'run-openclaw-1',
      toolName: 'system.run'
    }
  }, {
    now: '2026-05-03T01:03:00.000Z'
  });

  const [ended] = normalizeOpenClawEvent({
    hook: 'after_tool_call',
    event: {
      toolName: 'system.run',
      toolCallId: 'toolu_123',
      runId: 'run-openclaw-1',
      params: {
        command: 'pnpm test'
      },
      result: {
        exitCode: 1,
        stdout: '',
        stderr: '1 failing test'
      },
      durationMs: 2500
    },
    ctx: {
      sessionId: 'openclaw-session-1',
      runId: 'run-openclaw-1',
      toolName: 'system.run'
    }
  }, {
    now: '2026-05-03T01:04:00.000Z'
  });

  assert.equal(started.event_type, 'command.started');
  assert.equal(started.payload.binary, 'pnpm');
  assert.equal(started.payload.is_verification, true);
  assert.equal(ended.event_type, 'command.ended');
  assert.equal(ended.payload.exit_code, 1);
  assert.equal(ended.payload.duration_ms, 2500);
});

test('normalizeOpenClawEvent maps latest OpenClaw exec tool hooks to command events', () => {
  const [started] = normalizeOpenClawEvent({
    hook: 'before_tool_call',
    event: {
      toolName: 'exec',
      toolCallId: 'exec_123',
      runId: 'run-openclaw-2',
      params: {
        cmd: 'node -e "console.log(42)"'
      }
    },
    ctx: {
      sessionId: 'openclaw-session-2',
      runId: 'run-openclaw-2',
      toolName: 'exec',
      toolCallId: 'exec_123'
    }
  }, {
    now: '2026-05-03T01:05:00.000Z'
  });

  const [ended] = normalizeOpenClawEvent({
    hook: 'after_tool_call',
    event: {
      toolName: 'exec',
      toolCallId: 'exec_123',
      runId: 'run-openclaw-2',
      params: {
        cmd: 'node -e "console.log(42)"'
      },
      result: {
        exitCode: 0,
        stdout: '42\n'
      },
      durationMs: 300
    },
    ctx: {
      sessionId: 'openclaw-session-2',
      runId: 'run-openclaw-2',
      toolName: 'exec',
      toolCallId: 'exec_123'
    }
  }, {
    now: '2026-05-03T01:06:00.000Z'
  });

  assert.equal(started.event_type, 'command.started');
  assert.equal(started.payload.command_id, 'exec_123');
  assert.equal(started.payload.binary, 'node');
  assert.equal(ended.event_type, 'command.ended');
  assert.equal(ended.payload.exit_code, 0);
  assert.equal(ended.payload.duration_ms, 300);
});

test('normalizeOpenClawEvent maps latest OpenClaw exec details exitCode', () => {
  const [event] = normalizeOpenClawEvent({
    hook: 'after_tool_call',
    event: {
      toolName: 'exec',
      toolCallId: 'exec_false',
      runId: 'run-openclaw-failure',
      params: {
        command: 'false'
      },
      result: {
        content: [{ type: 'text', text: '\n\n(Command exited with code 1)' }],
        details: {
          status: 'completed',
          exitCode: 1,
          durationMs: 5
        },
        isError: false
      }
    },
    ctx: {
      sessionId: 'openclaw-session-failure',
      runId: 'run-openclaw-failure',
      toolName: 'exec',
      toolCallId: 'exec_false'
    }
  }, {
    now: '2026-05-05T12:05:00.000Z'
  });

  assert.equal(event.event_type, 'command.ended');
  assert.equal(event.payload.binary, 'false');
  assert.equal(event.payload.exit_code, 1);
  assert.equal(event.payload.duration_ms, 5);
});

test('normalizeOpenClawEvent resolves explicit OpenClaw session keys to the underlying session id', () => {
  const [event] = normalizeOpenClawEvent({
    hook: 'after_tool_call',
    event: {
      toolName: 'exec',
      toolCallId: 'exec_456',
      params: {
        cmd: 'node --version'
      },
      result: {
        exitCode: 0
      }
    },
    ctx: {
      sessionKey: 'agent:main:explicit:runq-docker-openclaw-123',
      runId: 'runq-docker-openclaw-123',
      toolName: 'exec',
      toolCallId: 'exec_456'
    }
  }, {
    now: '2026-05-03T01:07:00.000Z'
  });

  assert.equal(event.session_id, 'runq-docker-openclaw-123');
  assert.equal(event.run_id, 'runq-docker-openclaw-123');
});

test('normalizeOpenClawEvent maps node exec.finished agent event to command.ended', () => {
  const [event] = normalizeOpenClawEvent({
    stream: 'tool',
    runId: 'run-openclaw-1',
    sessionKey: 'telegram:thread:42',
    data: {
      type: 'exec.finished',
      sessionKey: 'telegram:thread:42',
      command: 'npm test',
      exitCode: 0,
      success: true,
      output: 'ok'
    }
  }, {
    now: '2026-05-03T01:05:00.000Z'
  });

  assert.equal(event.event_type, 'command.ended');
  assert.equal(event.session_id, 'telegram:thread:42');
  assert.equal(event.payload.binary, 'npm');
  assert.equal(event.payload.exit_code, 0);
});

test('OpenClaw hook command reads stdin and appends normalized events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-hook-'));
  const dbPath = join(dir, 'runq.db');
  const result = spawnSync(process.execPath, [
    hookPath,
    '--db',
    dbPath
  ], {
    input: JSON.stringify({
      hook: 'session_end',
      event: {
        sessionId: 'openclaw-session-hook',
        sessionKey: 'local:dev',
        messageCount: 8,
        durationMs: 9000
      },
      ctx: {
        agentId: 'devbot',
        sessionId: 'openclaw-session-hook'
      }
    }),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /recorded 1 RunQ events/);

  const store = new RunqStore(dbPath);
  const events = store.listEventsForSession('openclaw-session-hook');
  store.close();

  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, 'session.ended');
});
