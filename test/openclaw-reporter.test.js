import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { importNewOpenClawSessions } from '../tools/openclaw-reporter/reporter.js';
import { RunqStore } from '../src/store.js';

function writeSession(path, id) {
  writeFileSync(path, [
    JSON.stringify({ type: 'session', id, timestamp: '2026-05-03T01:00:00.000Z', cwd: '/repo/app' }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:00.020Z', message: { role: 'user', content: [{ type: 'text', text: 'Say ok' }] } }),
    JSON.stringify({ type: 'message', timestamp: '2026-05-03T01:00:01.000Z', message: { role: 'assistant', provider: 'clawvard-token', model: 'MiniMax-M2.7', content: [{ type: 'text', text: 'ok' }], usage: { input: 10, output: 1, totalTokens: 11 }, stopReason: 'stop' } })
  ].join('\n'));
}

test('importNewOpenClawSessions imports each session jsonl once', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-reporter-'));
  const sessionsDir = join(dir, 'sessions');
  const dbPath = join(dir, 'runq.db');
  const statePath = join(dir, 'state.json');
  mkdirSync(sessionsDir);
  writeSession(join(sessionsDir, 'session-a.jsonl'), 'session-a');

  const first = importNewOpenClawSessions({ sessionsDir, dbPath, statePath });
  const second = importNewOpenClawSessions({ sessionsDir, dbPath, statePath });

  assert.equal(first.imported_files, 1);
  assert.equal(first.imported_events, 7);
  assert.equal(second.imported_files, 0);

  const store = new RunqStore(dbPath);
  const sessions = store.listSessions();
  store.close();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].session_id, 'session-a');
  assert.equal(sessions[0].event_count, 7);
});
