import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const cliPath = new URL('../src/cli.js', import.meta.url).pathname;

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'runq-cli-'));
}

function makeEvent(id, eventType, timestamp) {
  return {
    runq_version: '0.1.0',
    event_id: id,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: 'ses_cli_1',
    run_id: 'run_cli_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {}
  };
}

test('CLI ingests a JSON event array and lists sessions', () => {
  const dir = tempDir();
  const dbPath = join(dir, 'runq.db');
  const eventsPath = join(dir, 'events.json');
  writeFileSync(eventsPath, JSON.stringify([
    makeEvent('evt_cli_1', 'session.started', '2026-05-02T10:00:00.000Z'),
    makeEvent('evt_cli_2', 'session.ended', '2026-05-02T10:05:00.000Z')
  ]));

  const ingest = spawnSync(process.execPath, [
    cliPath,
    'ingest',
    eventsPath,
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(ingest.status, 0, ingest.stderr);
  assert.match(ingest.stdout, /ingested 2 events/);

  const sessions = spawnSync(process.execPath, [
    cliPath,
    'sessions',
    '--db',
    dbPath
  ], {
    encoding: 'utf8'
  });

  assert.equal(sessions.status, 0, sessions.stderr);
  const rows = JSON.parse(sessions.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].session_id, 'ses_cli_1');
  assert.equal(rows[0].event_count, 2);
});

test('CLI prints an error for unknown commands', () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    'unknown'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown command: unknown/);
});
