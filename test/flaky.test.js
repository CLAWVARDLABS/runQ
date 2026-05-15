import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { detectFlakyPrompts } from '../src/flaky.js';
import { RunqStore } from '../src/store.js';

function tempDb() {
  return join(mkdtempSync(join(tmpdir(), 'runq-flaky-')), 'runq.db');
}

function event(eventId, sessionId, eventType, timestamp, payload = {}) {
  return {
    runq_version: '0.1.0',
    schema_version: '0.1.0',
    event_id: eventId,
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

function seedSession(store, sessionId, promptHash, trustOutcome, when) {
  // Successful sessions have a passing verification command + file change.
  // Failing sessions have a failed verification at session end.
  store.appendEvent(event(`${sessionId}_s`, sessionId, 'session.started', when));
  store.appendEvent(event(`${sessionId}_p`, sessionId, 'user.prompt.submitted', when, {
    prompt_hash: promptHash,
    prompt_summary: `do the thing for ${sessionId}`,
    prompt_length: 25
  }));
  if (trustOutcome === 'success') {
    store.appendEvent(event(`${sessionId}_f`, sessionId, 'file.changed', when, { file_extension: 'js', change_kind: 'modified' }));
    store.appendEvent(event(`${sessionId}_v`, sessionId, 'command.ended', when, {
      binary: 'npm', exit_code: 0, is_verification: true
    }));
  } else {
    store.appendEvent(event(`${sessionId}_f`, sessionId, 'file.changed', when, { file_extension: 'js', change_kind: 'modified' }));
    store.appendEvent(event(`${sessionId}_v`, sessionId, 'command.ended', when, {
      binary: 'npm', exit_code: 1, is_verification: true
    }));
  }
  store.appendEvent(event(`${sessionId}_e`, sessionId, 'session.ended', when));
}

test('detectFlakyPrompts returns an empty result on an empty DB', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  store.close();
  const result = detectFlakyPrompts(db);
  assert.deepEqual(result.clusters, []);
  assert.equal(result.total_clusters, 0);
});

test('detectFlakyPrompts ignores clusters with fewer than 3 runs', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  seedSession(store, 'ses_a', 'sha256:flaky', 'success', '2026-05-10T10:00:00.000Z');
  seedSession(store, 'ses_b', 'sha256:flaky', 'failure', '2026-05-10T11:00:00.000Z');
  store.close();
  const result = detectFlakyPrompts(db);
  assert.equal(result.clusters.length, 0);
});

test('detectFlakyPrompts flags a prompt that has 2 wins and 2 losses', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  seedSession(store, 'ses_w1', 'sha256:flaky', 'success', '2026-05-10T10:00:00.000Z');
  seedSession(store, 'ses_w2', 'sha256:flaky', 'success', '2026-05-10T11:00:00.000Z');
  seedSession(store, 'ses_l1', 'sha256:flaky', 'failure', '2026-05-10T12:00:00.000Z');
  seedSession(store, 'ses_l2', 'sha256:flaky', 'failure', '2026-05-10T13:00:00.000Z');
  store.close();
  const result = detectFlakyPrompts(db);
  assert.equal(result.clusters.length, 1);
  const cluster = result.clusters[0];
  assert.equal(cluster.prompt_hash, 'sha256:flaky');
  assert.equal(cluster.total_runs, 4);
  assert.ok(cluster.success_count >= 1, 'should see successes');
  assert.ok(cluster.failure_count >= 1, 'should see failures');
  assert.ok(cluster.trust_range >= 25, 'flaky requires a wide range');
  assert.ok(cluster.flakiness_score > 0);
  assert.ok(cluster.flakiness_score <= 1);
  assert.equal(cluster.sessions.length, 4);
});

test('detectFlakyPrompts excludes stable prompts (all-success or all-failure)', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  // Stable success
  seedSession(store, 'ok_1', 'sha256:stable_ok', 'success', '2026-05-10T10:00:00.000Z');
  seedSession(store, 'ok_2', 'sha256:stable_ok', 'success', '2026-05-10T10:30:00.000Z');
  seedSession(store, 'ok_3', 'sha256:stable_ok', 'success', '2026-05-10T11:00:00.000Z');
  // Stable failure
  seedSession(store, 'bad_1', 'sha256:stable_bad', 'failure', '2026-05-10T12:00:00.000Z');
  seedSession(store, 'bad_2', 'sha256:stable_bad', 'failure', '2026-05-10T12:30:00.000Z');
  seedSession(store, 'bad_3', 'sha256:stable_bad', 'failure', '2026-05-10T13:00:00.000Z');
  store.close();
  const result = detectFlakyPrompts(db);
  // Both prompts are consistent, neither should appear.
  assert.equal(result.clusters.length, 0);
});

test('detectFlakyPrompts ignores [redacted] prompt_hash values', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  seedSession(store, 'r1', '[redacted]', 'success', '2026-05-10T10:00:00.000Z');
  seedSession(store, 'r2', '[redacted]', 'failure', '2026-05-10T11:00:00.000Z');
  seedSession(store, 'r3', '[redacted]', 'failure', '2026-05-10T12:00:00.000Z');
  store.close();
  const result = detectFlakyPrompts(db);
  assert.equal(result.clusters.length, 0);
});

test('detectFlakyPrompts ranks clusters by flakiness_score (high first)', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  // Moderately flaky (range ~30)
  seedSession(store, 'm1', 'sha256:moderate', 'success', '2026-05-10T10:00:00.000Z');
  seedSession(store, 'm2', 'sha256:moderate', 'failure', '2026-05-10T10:30:00.000Z');
  seedSession(store, 'm3', 'sha256:moderate', 'success', '2026-05-10T11:00:00.000Z');
  seedSession(store, 'm4', 'sha256:moderate', 'failure', '2026-05-10T11:30:00.000Z');
  // Wildly flaky — same 4 outcomes but a bigger session sample
  for (let i = 0; i < 6; i += 1) {
    seedSession(store, `w${i}`, 'sha256:wild', i % 2 === 0 ? 'success' : 'failure', `2026-05-10T12:0${i}:00.000Z`);
  }
  store.close();
  const result = detectFlakyPrompts(db);
  assert.ok(result.clusters.length >= 1);
  // The first cluster should have the highest flakiness_score
  const scores = result.clusters.map((c) => c.flakiness_score);
  for (let i = 1; i < scores.length; i += 1) {
    assert.ok(scores[i - 1] >= scores[i], `expected ${scores[i - 1]} >= ${scores[i]} (sorted desc)`);
  }
});
