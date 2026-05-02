import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { handleRunInboxRequest } from '../apps/run-inbox/server.js';
import { RunqStore } from '../src/store.js';

function makeEvent(id, eventType, timestamp) {
  return {
    runq_version: '0.1.0',
    event_id: id,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: 'ses_ui_1',
    run_id: 'run_ui_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {}
  };
}

function makeFailedVerificationEvent() {
  return {
    runq_version: '0.1.0',
    event_id: 'evt_ui_failed_test',
    schema_version: '0.1.0',
    event_type: 'command.ended',
    timestamp: '2026-05-02T10:04:00.000Z',
    session_id: 'ses_ui_1',
    run_id: 'run_ui_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {
      binary: 'npm',
      args_hash: 'sha256:npm-test',
      exit_code: 1,
      is_verification: true
    }
  };
}

function createDbWithEvents() {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'runq-ui-')), 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(makeEvent('evt_ui_1', 'session.started', '2026-05-02T10:00:00.000Z'));
  store.appendEvent(makeEvent('evt_ui_file_changed', 'file.changed', '2026-05-02T10:03:00.000Z'));
  store.appendEvent(makeFailedVerificationEvent());
  store.appendEvent(makeEvent('evt_ui_2', 'session.ended', '2026-05-02T10:05:00.000Z'));
  store.close();
  return dbPath;
}

function request(dbPath, method, url) {
  let statusCode;
  let headers;
  let body = '';
  handleRunInboxRequest({ dbPath }, {
    method,
    url
  }, {
    writeHead(status, nextHeaders) {
      statusCode = status;
      headers = nextHeaders;
    },
    end(chunk) {
      body += chunk ?? '';
    }
  });
  return {
    status: statusCode,
    headers,
    text: body,
    json: headers?.['content-type']?.includes('application/json') ? JSON.parse(body) : undefined
  };
}

test('Run Inbox server returns sessions as JSON', () => {
  const dbPath = createDbWithEvents();
  const response = request(dbPath, 'GET', '/api/sessions');

  assert.equal(response.status, 200);
  assert.equal(response.json.length, 1);
  assert.equal(response.json[0].session_id, 'ses_ui_1');
  assert.equal(response.json[0].event_count, 4);
  assert.equal(response.json[0].quality.outcome_confidence, 0.2);
  assert.equal(response.json[0].quality.reasons.includes('verification_failed_at_end'), true);
  assert.equal(response.json[0].recommendations.length, 1);
  assert.equal(response.json[0].recommendations[0].category, 'verification_strategy');
});

test('Run Inbox server returns timeline events for a session', () => {
  const dbPath = createDbWithEvents();
  const response = request(dbPath, 'GET', '/api/sessions/ses_ui_1/events');

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.map((event) => event.event_id), [
    'evt_ui_1',
    'evt_ui_file_changed',
    'evt_ui_failed_test',
    'evt_ui_2'
  ]);
});

test('Run Inbox server serves the HTML app shell', () => {
  const dbPath = createDbWithEvents();
  const response = request(dbPath, 'GET', '/');

  assert.equal(response.status, 200);
  assert.match(response.text, /RunQ Run Inbox/);
  assert.match(response.text, /api\/sessions/);
});
