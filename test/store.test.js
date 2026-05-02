import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { RunqStore } from '../src/store.js';

function tempDbPath() {
  return join(mkdtempSync(join(tmpdir(), 'runq-store-')), 'runq.db');
}

function event(overrides = {}) {
  return {
    runq_version: '0.1.0',
    event_id: overrides.event_id ?? `evt_${Math.random().toString(16).slice(2)}`,
    schema_version: '0.1.0',
    event_type: overrides.event_type ?? 'session.started',
    timestamp: overrides.timestamp ?? '2026-05-02T10:15:30.000Z',
    session_id: overrides.session_id ?? 'ses_test_1',
    run_id: overrides.run_id ?? 'run_test_1',
    framework: overrides.framework ?? 'claude_code',
    source: overrides.source ?? 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: overrides.payload ?? {}
  };
}

test('RunqStore appends events and lists sessions ordered by latest event', () => {
  const store = new RunqStore(tempDbPath());
  store.appendEvent(event({
    event_id: 'evt_1',
    session_id: 'ses_a',
    run_id: 'run_a',
    timestamp: '2026-05-02T10:00:00.000Z',
    payload: { agent_name: 'Claude Code' }
  }));
  store.appendEvent(event({
    event_id: 'evt_2',
    session_id: 'ses_b',
    run_id: 'run_b',
    timestamp: '2026-05-02T11:00:00.000Z',
    framework: 'codex',
    payload: { agent_name: 'Codex' }
  }));

  assert.deepEqual(store.listSessions(), [
    {
      session_id: 'ses_b',
      run_count: 1,
      event_count: 1,
      framework: 'codex',
      started_at: '2026-05-02T11:00:00.000Z',
      last_event_at: '2026-05-02T11:00:00.000Z'
    },
    {
      session_id: 'ses_a',
      run_count: 1,
      event_count: 1,
      framework: 'claude_code',
      started_at: '2026-05-02T10:00:00.000Z',
      last_event_at: '2026-05-02T10:00:00.000Z'
    }
  ]);

  store.close();
});

test('RunqStore lists events for a session in timestamp order', () => {
  const store = new RunqStore(tempDbPath());
  store.appendEvent(event({
    event_id: 'evt_late',
    event_type: 'session.ended',
    timestamp: '2026-05-02T10:30:00.000Z'
  }));
  store.appendEvent(event({
    event_id: 'evt_early',
    event_type: 'session.started',
    timestamp: '2026-05-02T10:00:00.000Z'
  }));

  assert.deepEqual(
    store.listEventsForSession('ses_test_1').map((storedEvent) => storedEvent.event_id),
    ['evt_early', 'evt_late']
  );

  store.close();
});

test('RunqStore rejects invalid events before writing', () => {
  const store = new RunqStore(tempDbPath());
  const invalidEvent = event({ event_id: 'evt_invalid' });
  delete invalidEvent.run_id;

  assert.throws(
    () => store.appendEvent(invalidEvent),
    /Invalid RunQ event: run_id is required/
  );
  assert.deepEqual(store.listSessions(), []);

  store.close();
});
