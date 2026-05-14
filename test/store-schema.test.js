import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

import { RunqStore } from '../src/store.js';

function dbPath() {
  return join(mkdtempSync(join(tmpdir(), 'runq-store-')), 'runq.db');
}

function legacyEvent(eventId, sessionId, eventType, payload, timestamp) {
  return {
    runq_version: '0.1.0',
    event_id: eventId,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: sessionId,
    run_id: sessionId,
    framework: 'claude_code',
    source: 'hook',
    privacy: { level: 'metadata', redacted: true },
    payload
  };
}

test('Fresh RunqStore creates schema at SCHEMA_VERSION with WAL enabled', () => {
  const path = dbPath();
  const store = new RunqStore(path);
  store.close();

  const raw = new DatabaseSync(path);
  try {
    assert.equal(Number(raw.prepare('PRAGMA user_version').get().user_version), 1);
    assert.equal(String(raw.prepare('PRAGMA journal_mode').get().journal_mode).toLowerCase(), 'wal');
    const cols = raw.prepare('PRAGMA table_info(events)').all().map((r) => r.name);
    for (const col of ['tool_name', 'model', 'status', 'exit_code', 'duration_ms', 'is_verification']) {
      assert.ok(cols.includes(col), `events.${col} should exist on fresh DB`);
    }
    const indexes = raw.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r) => r.name);
    assert.ok(indexes.includes('idx_events_framework_type_time'));
    assert.ok(indexes.includes('idx_events_tool_name'));
  } finally {
    raw.close();
  }
});

test('appendEvent populates hot columns from payload at write time', () => {
  const path = dbPath();
  const store = new RunqStore(path);
  store.appendEvent(legacyEvent(
    'evt_hot_1', 'ses_hot', 'tool.call.started',
    { tool_name: 'Read', model: 'claude-opus-4-7' },
    '2026-05-10T10:00:00.000Z'
  ));
  store.appendEvent(legacyEvent(
    'evt_hot_2', 'ses_hot', 'command.ended',
    { binary: 'npm', exit_code: 0, duration_ms: 1200, is_verification: true },
    '2026-05-10T10:00:05.000Z'
  ));
  store.close();

  const raw = new DatabaseSync(path);
  try {
    const rows = raw.prepare(
      'SELECT event_id, tool_name, model, exit_code, duration_ms, is_verification FROM events ORDER BY event_id'
    ).all();
    assert.equal(rows[0].tool_name, 'Read');
    assert.equal(rows[0].model, 'claude-opus-4-7');
    assert.equal(rows[1].exit_code, 0);
    assert.equal(rows[1].duration_ms, 1200);
    assert.equal(rows[1].is_verification, 1);
  } finally {
    raw.close();
  }
});

test('Migration backfills hot columns from a legacy (pre-v1) DB', () => {
  const path = dbPath();

  // Synthesise a legacy DB: events table without hot columns, user_version = 0.
  const raw = new DatabaseSync(path);
  raw.exec(`
    CREATE TABLE events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      parent_id TEXT,
      event_type TEXT NOT NULL,
      framework TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      privacy_level TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      event_json TEXT NOT NULL
    );
  `);
  raw.prepare(`
    INSERT INTO events (event_id, session_id, run_id, parent_id, event_type, framework, source, timestamp, privacy_level, payload_json, event_json)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'evt_legacy', 'ses_legacy', 'ses_legacy',
    'tool.call.started', 'claude_code', 'hook', '2026-05-09T10:00:00.000Z', 'metadata',
    JSON.stringify({ tool_name: 'Edit', duration_ms: 42 }),
    JSON.stringify({ event_id: 'evt_legacy', event_type: 'tool.call.started' })
  );
  raw.exec('PRAGMA user_version = 0');
  raw.close();

  // Open via RunqStore — migration should auto-run.
  const store = new RunqStore(path);
  store.close();

  const after = new DatabaseSync(path);
  try {
    assert.equal(Number(after.prepare('PRAGMA user_version').get().user_version), 1);
    const row = after.prepare('SELECT tool_name, duration_ms FROM events WHERE event_id = ?').get('evt_legacy');
    assert.equal(row.tool_name, 'Edit');
    assert.equal(row.duration_ms, 42);
  } finally {
    after.close();
  }
});

test('aggregateToolCalls returns SQL-side tool counts ordered by frequency', () => {
  const path = dbPath();
  const store = new RunqStore(path);
  for (let i = 0; i < 7; i += 1) {
    store.appendEvent(legacyEvent(`evt_a_${i}`, 'ses_aggr', 'tool.call.started', { tool_name: 'Bash' }, `2026-05-10T10:00:0${i}.000Z`));
  }
  for (let i = 0; i < 3; i += 1) {
    store.appendEvent(legacyEvent(`evt_b_${i}`, 'ses_aggr', 'tool.call.started', { tool_name: 'Read' }, `2026-05-10T11:00:0${i}.000Z`));
  }
  // Different framework, should be excluded from aggregation
  store.appendEvent({
    ...legacyEvent('evt_other', 'ses_other', 'tool.call.started', { tool_name: 'Bash' }, '2026-05-10T12:00:00.000Z'),
    framework: 'codex'
  });

  const top = store.aggregateToolCalls('claude_code', { limit: 5 });
  store.close();
  assert.deepEqual(top, [
    { tool: 'Bash', count: 7 },
    { tool: 'Read', count: 3 }
  ]);
});
