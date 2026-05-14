import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

import {
  claudeCodeSessionRowsToEvents,
  listClaudeCodeSessionFiles
} from '../src/importers/claude-code.js';
import {
  codexRolloutRowsToEvents,
  listCodexSessionFiles
} from '../src/importers/codex.js';
import {
  hermesStateRowsToEvents,
  hermesStateAvailable,
  importHermesState
} from '../src/importers/hermes.js';
import { listOpenClawSessionFiles } from '../src/importers/openclaw.js';
import { runAgentCheckup } from '../src/agent-checkup.js';
import { RunqStore } from '../src/store.js';

function home() {
  return mkdtempSync(join(tmpdir(), 'runq-importer-'));
}

test('claudeCodeSessionRowsToEvents emits a minimum-viable timeline', () => {
  const rows = [
    { sessionId: 'ses_a', cwd: '/repo', timestamp: '2026-05-01T10:00:00.000Z', type: 'user', message: { role: 'user', content: '继续' } },
    {
      sessionId: 'ses_a',
      timestamp: '2026-05-01T10:00:05.000Z',
      message: {
        id: 'msg_1',
        role: 'assistant',
        model: 'claude-opus-4-7',
        content: [
          { type: 'text', text: 'ok' },
          { type: 'tool_use', id: 'too_1', name: 'Read', input: {} }
        ],
        usage: { input_tokens: 100, output_tokens: 30 }
      }
    },
    {
      sessionId: 'ses_a',
      timestamp: '2026-05-01T10:00:06.000Z',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'too_1', is_error: false }] }
    },
    { sessionId: 'ses_a', timestamp: '2026-05-01T10:00:10.000Z', type: 'user', message: { role: 'user', content: 'done' } }
  ];
  const events = claudeCodeSessionRowsToEvents(rows);
  const types = events.map((e) => e.event_type);
  assert.ok(types.includes('session.started'));
  assert.ok(types.includes('session.ended'));
  assert.ok(types.includes('user.prompt.submitted'));
  assert.ok(types.includes('model.call.started'));
  assert.ok(types.includes('model.call.ended'));
  assert.ok(types.includes('tool.call.started'));
  assert.ok(types.includes('tool.call.ended'));
  assert.ok(types.includes('outcome.scored'));
  for (const event of events) {
    assert.equal(event.session_id, 'ses_a');
    assert.equal(event.framework, 'claude_code');
    assert.equal(event.source, 'import');
  }
});

test('claudeCodeSessionRowsToEvents deduplicates streamed assistant messages by msg id', () => {
  const rows = [
    {
      sessionId: 'ses_dup',
      timestamp: '2026-05-01T10:00:00.000Z',
      message: { id: 'msg_x', role: 'assistant', model: 'claude-opus-4-7', content: [], usage: {} }
    },
    {
      sessionId: 'ses_dup',
      timestamp: '2026-05-01T10:00:01.000Z',
      message: { id: 'msg_x', role: 'assistant', model: 'claude-opus-4-7', content: [], usage: {} }
    }
  ];
  const events = claudeCodeSessionRowsToEvents(rows);
  const modelStarts = events.filter((e) => e.event_type === 'model.call.started');
  assert.equal(modelStarts.length, 1, 'streamed duplicates should collapse to one model call');
});

test('codexRolloutRowsToEvents emits a minimum-viable timeline with function calls', () => {
  const rows = [
    {
      timestamp: '2026-05-05T09:46:09.776Z',
      type: 'session_meta',
      payload: { id: 'ses_codex_a', timestamp: '2026-05-05T09:46:09.776Z', cwd: '/repo', cli_version: '0.128.0' }
    },
    {
      timestamp: '2026-05-05T09:46:09.800Z',
      type: 'turn_context',
      payload: { turn_id: 't1', cwd: '/repo', model: 'gpt-5.1-codex', model_provider: 'openai' }
    },
    {
      timestamp: '2026-05-05T09:46:10.000Z',
      type: 'response_item',
      payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'fix bug' }] }
    },
    {
      timestamp: '2026-05-05T09:46:15.000Z',
      type: 'response_item',
      payload: { type: 'function_call', name: 'exec_command', call_id: 'call_1', arguments: '{}' }
    },
    {
      timestamp: '2026-05-05T09:46:16.000Z',
      type: 'response_item',
      payload: { type: 'function_call_output', call_id: 'call_1', output: { metadata: { exit_code: 0 } } }
    },
    {
      timestamp: '2026-05-05T09:46:17.000Z',
      type: 'event_msg',
      payload: { type: 'token_count', info: { last_token_usage: { input_tokens: 200, output_tokens: 50, cached_input_tokens: 100, reasoning_output_tokens: 0 } } }
    }
  ];
  const events = codexRolloutRowsToEvents(rows);
  const types = events.map((e) => e.event_type);
  assert.ok(types.includes('session.started'));
  assert.ok(types.includes('session.ended'));
  assert.ok(types.includes('user.prompt.submitted'));
  assert.ok(types.includes('tool.call.started'));
  assert.ok(types.includes('tool.call.ended'));
  const modelEnd = events.find((e) => e.event_type === 'model.call.ended');
  assert.equal(Number(modelEnd?.payload?.input_tokens), 200);
});

test('hermesStateRowsToEvents emits a timeline from sessions + messages rows', () => {
  const session = {
    id: 'ses_hermes_a',
    source: 'cli',
    started_at: 1730000000,
    ended_at: 1730000060,
    model: 'claude-sonnet-4-6',
    billing_provider: 'anthropic',
    input_tokens: 500,
    output_tokens: 120
  };
  const messages = [
    { id: 1, session_id: session.id, role: 'user', content: 'hi', timestamp: 1730000001 },
    {
      id: 2,
      session_id: session.id,
      role: 'assistant',
      content: 'ok',
      timestamp: 1730000010,
      token_count: 30,
      tool_calls: JSON.stringify([{ id: 'tool_1', function: { name: 'write' } }])
    },
    { id: 3, session_id: session.id, role: 'tool', tool_call_id: 'tool_1', tool_name: 'write', timestamp: 1730000012 }
  ];
  const events = hermesStateRowsToEvents(session, messages);
  const types = events.map((e) => e.event_type);
  assert.ok(types.includes('session.started'));
  assert.ok(types.includes('session.ended'));
  assert.ok(types.includes('tool.call.started'));
  assert.ok(types.includes('tool.call.ended'));
  for (const event of events) {
    assert.equal(event.framework, 'hermes');
  }
});

test('listClaudeCodeSessionFiles returns [] when ~/.claude/projects is missing', () => {
  const h = home();
  assert.deepEqual(listClaudeCodeSessionFiles(h), []);
});

test('listCodexSessionFiles walks YYYY/MM/DD shard tree', () => {
  const h = home();
  const dir = join(h, '.codex', 'sessions', '2026', '05', '05');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'rollout-a.jsonl'), JSON.stringify({ type: 'session_meta', timestamp: '2026-05-05T00:00:00Z', payload: { id: 'a', timestamp: '2026-05-05T00:00:00Z' } }) + '\n');
  writeFileSync(join(dir, 'empty.jsonl'), '');
  const files = listCodexSessionFiles(h);
  assert.equal(files.length, 1);
  assert.match(files[0].path, /rollout-a\.jsonl$/);
});

test('listOpenClawSessionFiles returns [] when ~/.openclaw is missing', () => {
  const h = home();
  assert.deepEqual(listOpenClawSessionFiles(h), []);
});

test('hermesStateAvailable is false when ~/.hermes/state.db missing', () => {
  const h = home();
  assert.equal(hermesStateAvailable(h), false);
});

test('importHermesState reads sessions + messages from a real SQLite db', () => {
  const h = home();
  mkdirSync(join(h, '.hermes'), { recursive: true });
  const db = new DatabaseSync(join(h, '.hermes', 'state.db'));
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, source TEXT, user_id TEXT, model TEXT, model_config TEXT,
      system_prompt TEXT, parent_session_id TEXT, started_at REAL, ended_at REAL,
      end_reason TEXT, message_count INTEGER, tool_call_count INTEGER,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_write_tokens INTEGER, reasoning_tokens INTEGER, billing_provider TEXT,
      billing_base_url TEXT, billing_mode TEXT, estimated_cost_usd REAL,
      actual_cost_usd REAL, cost_status TEXT, cost_source TEXT, pricing_version TEXT,
      title TEXT, api_call_count INTEGER
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT,
      tool_call_id TEXT, tool_calls TEXT, tool_name TEXT, timestamp REAL,
      token_count INTEGER, finish_reason TEXT
    );
  `);
  db.prepare(
    'INSERT INTO sessions (id, source, started_at, ended_at, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('ses_hermes_real', 'cli', 1730000000, 1730000060, 'sonnet', 100, 50);
  db.prepare(
    'INSERT INTO messages (session_id, role, content, timestamp, token_count) VALUES (?, ?, ?, ?, ?)'
  ).run('ses_hermes_real', 'user', 'hi', 1730000001, 1);
  db.prepare(
    'INSERT INTO messages (session_id, role, content, timestamp, token_count, finish_reason) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('ses_hermes_real', 'assistant', 'ok', 1730000010, 5, 'stop');
  db.close();

  const result = importHermesState(h);
  assert.equal(result.sessions, 1);
  assert.ok(result.events.length >= 4);
  for (const event of result.events) {
    assert.equal(event.framework, 'hermes');
    assert.equal(event.session_id, 'ses_hermes_real');
  }
});

test('runAgentCheckup is idempotent: re-running inserts zero new events', async () => {
  const h = home();
  const projectsDir = join(h, '.claude', 'projects', '-repo');
  mkdirSync(projectsDir, { recursive: true });
  const transcript = [
    { sessionId: 'ses_idem', cwd: '/repo', timestamp: '2026-05-01T10:00:00.000Z', type: 'user', message: { role: 'user', content: 'go' } },
    {
      sessionId: 'ses_idem',
      timestamp: '2026-05-01T10:00:05.000Z',
      message: { id: 'msg_idem', role: 'assistant', model: 'claude-opus-4-7', content: [], usage: { input_tokens: 10, output_tokens: 3 } }
    }
  ].map((row) => JSON.stringify(row)).join('\n') + '\n';
  writeFileSync(join(projectsDir, 'ses_idem.jsonl'), transcript);

  const dbPath = join(h, 'runq.db');

  const first = await runAgentCheckup('claude_code', { dbPath, homeDir: h });
  assert.equal(first.status, 'success');
  assert.ok(first.imported_events > 0);

  const second = await runAgentCheckup('claude_code', { dbPath, homeDir: h });
  assert.equal(second.imported_events, 0, 're-run should be idempotent');
  assert.equal(second.skipped_events, first.imported_events);

  const store = new RunqStore(dbPath);
  try {
    const sessions = store.listSessions();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].session_id, 'ses_idem');
  } finally {
    store.close();
  }
});

test('runAgentCheckup returns status=absent when agent home dir is missing', async () => {
  const h = home();
  const result = await runAgentCheckup('codex', { dbPath: join(h, 'runq.db'), homeDir: h });
  assert.equal(result.status, 'absent');
  assert.equal(result.imported_events, 0);
});

test('runAgentCheckup returns status=empty when agent installed but no history', async () => {
  const h = home();
  mkdirSync(join(h, '.claude', 'projects'), { recursive: true });
  const result = await runAgentCheckup('claude_code', { dbPath: join(h, 'runq.db'), homeDir: h });
  assert.equal(result.status, 'empty');
  assert.equal(result.scanned_files, 0);
});

test('runAgentCheckup installs RunQ hooks into the agent settings file', async () => {
  const h = home();
  mkdirSync(join(h, '.claude'), { recursive: true });
  const result = await runAgentCheckup('claude_code', {
    dbPath: join(h, 'runq.db'),
    homeDir: h
  });
  assert.equal(result.hooks_installed, true, 'hooks_installed should be true');
  const settings = JSON.parse(readFileSync(join(h, '.claude', 'settings.local.json'), 'utf8'));
  assert.ok(settings.hooks?.SessionStart, 'SessionStart hook should be written');
  assert.match(
    settings.hooks.SessionStart[0].hooks[0].command,
    /adapters\/claude-code\/hook\.js/
  );
});

test('runAgentCheckup skips hook install when installHooks=false', async () => {
  const h = home();
  mkdirSync(join(h, '.claude'), { recursive: true });
  const result = await runAgentCheckup('claude_code', {
    dbPath: join(h, 'runq.db'),
    homeDir: h,
    installHooks: false
  });
  assert.equal(result.hooks_installed, false);
  assert.equal(
    existsSync(join(h, '.claude', 'settings.local.json')),
    false,
    'settings.local.json should not be written when installHooks=false'
  );
});

test('claudeCodeSessionRowsToEvents emits one event per user prompt with real snippets', () => {
  const rows = [
    { sessionId: 'ses_p', cwd: '/r', timestamp: '2026-05-10T10:00:00.000Z', uuid: 'u1', type: 'user', message: { role: 'user', content: '请帮我重构 API 路由模块' } },
    {
      sessionId: 'ses_p',
      timestamp: '2026-05-10T10:00:05.000Z',
      message: { id: 'msg_1', role: 'assistant', model: 'claude-opus-4-7', content: [], usage: {} }
    },
    // tool_result-only user message — should be skipped
    {
      sessionId: 'ses_p',
      timestamp: '2026-05-10T10:00:08.000Z',
      uuid: 'u-tool-result',
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x' }] }
    },
    { sessionId: 'ses_p', timestamp: '2026-05-10T10:00:10.000Z', uuid: 'u2', type: 'user', message: { role: 'user', content: '改成命名路由,顺便加上缓存' } },
    { sessionId: 'ses_p', timestamp: '2026-05-10T10:00:20.000Z', uuid: 'u3', type: 'user', message: { role: 'user', content: '继续' } }
  ];
  const events = claudeCodeSessionRowsToEvents(rows);
  const prompts = events.filter((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(prompts.length, 3, 'three real user prompts should produce three events');
  const ids = new Set(prompts.map((e) => e.event_id));
  assert.equal(ids.size, 3, 'each prompt event must have a unique id');
  assert.match(prompts[0].payload.prompt_summary, /重构/);
  assert.match(prompts[1].payload.prompt_summary, /缓存/);
  assert.equal(prompts[2].payload.prompt_summary, '继续');
  for (const p of prompts) {
    assert.equal(typeof p.payload.prompt_length, 'number');
    assert.match(p.payload.prompt_hash || '', /^sha256:/);
  }
});

test('claudeCodeSessionRowsToEvents is idempotent for the multi-prompt path', () => {
  const rows = [
    { sessionId: 'ses_idem_p', cwd: '/r', timestamp: '2026-05-10T10:00:00.000Z', uuid: 'u1', type: 'user', message: { role: 'user', content: 'prompt A' } },
    { sessionId: 'ses_idem_p', timestamp: '2026-05-10T10:00:05.000Z', uuid: 'u2', type: 'user', message: { role: 'user', content: 'prompt B' } }
  ];
  const first = claudeCodeSessionRowsToEvents(rows);
  const second = claudeCodeSessionRowsToEvents(rows);
  const firstIds = first.filter((e) => e.event_type === 'user.prompt.submitted').map((e) => e.event_id);
  const secondIds = second.filter((e) => e.event_type === 'user.prompt.submitted').map((e) => e.event_id);
  assert.deepEqual(firstIds, secondIds, 're-running on the same fixture should produce the same event ids');
});

test('runAgentCheckup absent result reports hooks_installed=false', async () => {
  const h = home();
  // No .codex dir at all
  const result = await runAgentCheckup('codex', { dbPath: join(h, 'runq.db'), homeDir: h });
  assert.equal(result.status, 'absent');
  assert.equal(result.hooks_installed, false);
});

test('importers keep raw prompt/command/output when privacyMode is off', () => {
  const ccRows = [
    { sessionId: 'ses_raw', cwd: '/repo', timestamp: '2026-05-01T10:00:00.000Z', type: 'user', message: { role: 'user', content: 'leak the db password' } },
    {
      sessionId: 'ses_raw',
      timestamp: '2026-05-01T10:00:05.000Z',
      message: {
        id: 'msg_r', role: 'assistant', model: 'claude-opus-4-7',
        content: [{ type: 'tool_use', id: 'too_r', name: 'Bash', input: { command: 'cat .env' } }],
        usage: {}
      }
    },
    {
      sessionId: 'ses_raw',
      timestamp: '2026-05-01T10:00:06.000Z',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'too_r', is_error: false, content: 'DB_PASSWORD=hunter2' }] }
    }
  ];
  const ccEvents = claudeCodeSessionRowsToEvents(ccRows, null, 'off');
  const prompt = ccEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(prompt.payload.prompt, 'leak the db password');
  assert.equal(prompt.privacy.level, 'sensitive');
  assert.equal(prompt.privacy.redacted, false);
  const cmd = ccEvents.find((e) => e.event_type === 'command.ended');
  assert.equal(cmd.payload.command, 'cat .env');
  assert.equal(cmd.payload.output, 'DB_PASSWORD=hunter2');

  // privacyMode=on (default) keeps the metadata-only shape
  const ccDefault = claudeCodeSessionRowsToEvents(ccRows);
  const promptOn = ccDefault.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(promptOn.payload.prompt, undefined);
  assert.equal(promptOn.payload.prompt_length, 'leak the db password'.length);
  assert.equal(promptOn.privacy.redacted, true);
});

test('codexRolloutRowsToEvents keeps raw prompt when privacyMode is off', () => {
  const rows = [
    { timestamp: '2026-05-05T09:46:09.776Z', type: 'session_meta', payload: { id: 'ses_codex_raw', timestamp: '2026-05-05T09:46:09.776Z', cwd: '/repo' } },
    {
      timestamp: '2026-05-05T09:46:10.000Z',
      type: 'response_item',
      payload: { type: 'message', role: 'user', content: [{ text: 'print the api key' }] }
    }
  ];
  const offEvents = codexRolloutRowsToEvents(rows, null, 'off');
  const prompt = offEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(prompt.payload.prompt, 'print the api key');
  assert.equal(prompt.privacy.redacted, false);

  const onEvents = codexRolloutRowsToEvents(rows);
  const promptOn = onEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(promptOn.payload.prompt, undefined);
  assert.equal(promptOn.payload.prompt_length, 'print the api key'.length);
});

test('hermesStateRowsToEvents keeps raw prompt when privacyMode is off', () => {
  const session = { id: 'ses_hermes_raw', started_at: 1893456000, ended_at: 1893456060, model: 'gpt-5.1' };
  const messages = [
    { id: 'm1', role: 'user', content: 'reveal secrets', timestamp: 1893456001 }
  ];
  const offEvents = hermesStateRowsToEvents(session, messages, 'off');
  const prompt = offEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(prompt.payload.prompt, 'reveal secrets');
  assert.equal(prompt.privacy.redacted, false);

  const onEvents = hermesStateRowsToEvents(session, messages);
  const promptOn = onEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(promptOn.payload.prompt, undefined);
});
