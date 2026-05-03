import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEvent } from '../src/schema.js';

const validEvent = {
  runq_version: '0.1.0',
  event_id: 'evt_test_1',
  schema_version: '0.1.0',
  event_type: 'session.started',
  timestamp: '2026-05-02T10:15:30.000Z',
  session_id: 'ses_test_1',
  run_id: 'run_test_1',
  framework: 'claude_code',
  source: 'hook',
  privacy: {
    level: 'metadata',
    redacted: true
  },
  payload: {
    agent_name: 'Claude Code'
  }
};

test('validateEvent accepts a valid RunQ event envelope', () => {
  assert.deepEqual(validateEvent(validEvent), {
    ok: true,
    errors: []
  });
});

test('validateEvent accepts satisfaction.recorded events', () => {
  assert.deepEqual(validateEvent({
    ...validEvent,
    event_id: 'evt_satisfaction_1',
    event_type: 'satisfaction.recorded',
    source: 'manual',
    payload: {
      label: 'accepted',
      signal: 'user kept the agent output',
      confidence: 1
    }
  }), {
    ok: true,
    errors: []
  });
});

test('validateEvent rejects events missing required envelope fields', () => {
  const event = { ...validEvent };
  delete event.session_id;

  assert.deepEqual(validateEvent(event), {
    ok: false,
    errors: ['session_id is required']
  });
});

test('validateEvent rejects unknown event types and privacy levels', () => {
  const event = {
    ...validEvent,
    event_type: 'unknown.event',
    privacy: {
      level: 'public',
      redacted: true
    }
  };

  assert.deepEqual(validateEvent(event), {
    ok: false,
    errors: [
      'event_type must be a known RunQ event type',
      'privacy.level must be one of metadata, summary, sensitive, secret'
    ]
  });
});
