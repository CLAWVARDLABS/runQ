import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { RunqStore } from '../src/store.js';
import { createReadinessReport } from '../src/readiness.js';

const cliPath = new URL('../src/cli.js', import.meta.url).pathname;

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'runq-readiness-'));
}

function event(eventId, eventType, sessionId, payload = {}) {
  return {
    runq_version: '0.1.0',
    event_id: eventId,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp: '2026-05-03T10:00:00.000Z',
    session_id: sessionId,
    run_id: sessionId,
    framework: 'openclaw',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload
  };
}

test('createReadinessReport summarizes usable timelines and redaction leaks', () => {
  const dbPath = join(tempDir(), 'runq.db');
  const store = new RunqStore(dbPath, { redactionPolicy: { secretPatterns: [] } });
  store.appendEvent(event('evt_model_start', 'model.call.started', 'ses_good', { model: 'MiniMax-M2.7' }));
  store.appendEvent(event('evt_cmd_end', 'command.ended', 'ses_good', { binary: 'npm', exit_code: 0 }));
  store.appendEvent(event('evt_lonely', 'session.started', 'ses_thin', { agent_name: 'OpenClaw' }));
  store.appendEvent(event('evt_leak', 'command.ended', 'ses_leak', { stderr_hash: 'sk-leaked-secret-value' }));
  store.close();

  const report = createReadinessReport({ dbPath });

  assert.equal(report.sessions.total, 3);
  assert.equal(report.sessions.usable_timeline_count, 1);
  assert.equal(report.sessions.usable_timeline_percent, 0.33);
  assert.equal(report.redaction.secret_like_payload_findings.length, 1);
  assert.equal(report.redaction.secret_like_payload_findings[0].event_id, 'evt_leak');
  assert.equal(report.ready_for_public_preview, false);
});

test('CLI readiness prints a JSON readiness report', () => {
  const dbPath = join(tempDir(), 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(event('evt_model_start', 'model.call.started', 'ses_cli', { model: 'MiniMax-M2.7' }));
  store.appendEvent(event('evt_model_end', 'model.call.ended', 'ses_cli', { duration_ms: 1000 }));
  store.close();

  const result = spawnSync(process.execPath, [
    cliPath,
    'readiness',
    '--db',
    dbPath,
    '--json'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.sessions.total, 1);
  assert.equal(report.sessions.usable_timeline_count, 1);
  assert.equal(report.redaction.secret_like_payload_findings.length, 0);
});
