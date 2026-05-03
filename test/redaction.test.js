import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { redactEvent } from '../src/redaction.js';
import { RunqStore } from '../src/store.js';

function event(payload) {
  return {
    runq_version: '0.1.0',
    event_id: 'evt_redact_1',
    schema_version: '0.1.0',
    event_type: 'command.ended',
    timestamp: '2026-05-03T08:00:00.000Z',
    session_id: 'ses_redact_1',
    run_id: 'run_redact_1',
    framework: 'openclaw',
    source: 'import',
    privacy: { level: 'sensitive', redacted: false },
    payload
  };
}

test('redactEvent removes raw prompts, command output, and secret-looking strings by default', () => {
  const redacted = redactEvent(event({
    command: 'curl -H "Authorization: Bearer sk-secret" https://api.example.test',
    stdout: 'token=abc123',
    stderr: 'PASSWORD=hunter2',
    nested: {
      prompt: 'write code with API_KEY=sk-test'
    },
    exit_code: 0
  }));

  assert.equal(redacted.privacy.redacted, true);
  assert.equal(redacted.privacy.level, 'metadata');
  assert.equal(redacted.payload.command, '[redacted]');
  assert.equal(redacted.payload.stdout, '[redacted]');
  assert.equal(redacted.payload.stderr, '[redacted]');
  assert.equal(redacted.payload.nested.prompt, '[redacted]');
  assert.equal(redacted.payload.exit_code, 0);
});

test('RunqStore redacts events before persistence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-redaction-store-'));
  const dbPath = join(dir, 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(event({
    output: 'secret_token=abc123',
    exit_code: 0
  }));

  const [stored] = store.listEventsForSession('ses_redact_1');
  store.close();

  assert.equal(stored.privacy.redacted, true);
  assert.equal(stored.payload.output, '[redacted]');
  assert.equal(stored.payload.exit_code, 0);
});
