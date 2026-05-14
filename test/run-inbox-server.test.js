import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { handleRunInboxRequest, createRunInboxServer } from '../apps/run-inbox/server.js';
import { RunqStore } from '../src/store.js';

function makeEvent(id, eventType, timestamp, payload = {}) {
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
    payload
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

function makeSatisfactionEvent() {
  return {
    runq_version: '0.1.0',
    event_id: 'evt_ui_satisfaction',
    schema_version: '0.1.0',
    event_type: 'satisfaction.recorded',
    timestamp: '2026-05-02T10:06:00.000Z',
    session_id: 'ses_ui_1',
    run_id: 'run_ui_1',
    framework: 'claude_code',
    source: 'manual',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {
      label: 'abandoned',
      signal: 'developer stopped after failed verification'
    }
  };
}

function createDbWithEvents() {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'runq-ui-')), 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(makeEvent('evt_ui_1', 'session.started', '2026-05-02T10:00:00.000Z'));
  store.appendEvent(makeEvent('evt_ui_model', 'model.call.ended', '2026-05-02T10:02:00.000Z', {
    input_tokens: 100,
    output_tokens: 25,
    total_tokens: 125,
    duration_ms: 1500
  }));
  store.appendEvent(makeEvent('evt_ui_file_changed', 'file.changed', '2026-05-02T10:03:00.000Z'));
  store.appendEvent(makeFailedVerificationEvent());
  store.appendEvent(makeEvent('evt_ui_2', 'session.ended', '2026-05-02T10:05:00.000Z'));
  store.appendEvent(makeSatisfactionEvent());
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
  assert.equal(response.json[0].event_count, 6);
  assert.equal(response.json[0].quality.outcome_confidence, 0.07);
  assert.equal(response.json[0].quality.reasons.includes('verification_failed_at_end'), true);
  assert.equal(response.json[0].quality.reasons.includes('satisfaction_abandoned'), true);
  assert.equal(response.json[0].recommendations.length, 1);
  assert.equal(response.json[0].recommendations[0].category, 'verification_strategy');
  assert.equal(response.json[0].satisfaction.label, 'abandoned');
  assert.deepEqual(response.json[0].telemetry, {
    model_call_count: 1,
    tool_call_count: 0,
    input_tokens: 100,
    output_tokens: 25,
    total_tokens: 125,
    model_duration_ms: 1500,
    avg_model_duration_ms: 1500,
    command_count: 1,
    command_duration_ms: 0,
    avg_command_duration_ms: 0,
    verification_count: 1,
    verification_passed_count: 0,
    verification_failed_count: 1,
    file_change_count: 1
  });
});

test('Run Inbox server returns timeline events for a session', () => {
  const dbPath = createDbWithEvents();
  const response = request(dbPath, 'GET', '/api/sessions/ses_ui_1/events');

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.map((event) => event.event_id), [
    'evt_ui_1',
    'evt_ui_model',
    'evt_ui_file_changed',
    'evt_ui_failed_test',
    'evt_ui_2',
    'evt_ui_satisfaction'
  ]);
});

function startServer(dbPath) {
  return new Promise((resolve) => {
    const server = createRunInboxServer({ dbPath });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('Run Inbox server records a recommendation.accepted event via POST', async () => {
  const dbPath = createDbWithEvents();
  const { server, baseUrl } = await startServer(dbPath);
  try {
    const response = await fetch(`${baseUrl}/api/sessions/ses_ui_1/recommendations/rec_verification_strategy/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'accepted', note: 'will fix' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.event_type, 'recommendation.accepted');

    const sessions = await (await fetch(`${baseUrl}/api/sessions`)).json();
    const recommendation = sessions[0].recommendations.find((rec) => rec.recommendation_id === 'rec_verification_strategy');
    assert.equal(recommendation.state.status, 'accepted');
    assert.equal(recommendation.state.note, 'will fix');
  } finally {
    await stopServer(server);
  }
});

test('Run Inbox server rejects feedback with an unknown decision', async () => {
  const dbPath = createDbWithEvents();
  const { server, baseUrl } = await startServer(dbPath);
  try {
    const response = await fetch(`${baseUrl}/api/sessions/ses_ui_1/recommendations/rec_verification_strategy/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'nope' })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /accepted|dismissed/);
  } finally {
    await stopServer(server);
  }
});

test('Run Inbox server serves the HTML app shell', () => {
  const dbPath = createDbWithEvents();
  const response = request(dbPath, 'GET', '/');

  assert.equal(response.status, 200);
  assert.match(response.text, /RunQ Run Inbox/);
  assert.match(response.text, /data-pane="runs"/);
  assert.match(response.text, /data-pane="timeline"/);
  assert.match(response.text, /data-pane="quality"/);
  assert.match(response.text, /Quality Inspector/);
  assert.match(response.text, /Recommendations/);
  assert.match(response.text, /No runs captured yet/);
  assert.match(response.text, /api\/sessions/);
});
