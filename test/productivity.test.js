import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getProductivityReport } from '../src/productivity.js';
import { RunqStore } from '../src/store.js';

function tempDb() {
  return join(mkdtempSync(join(tmpdir(), 'runq-prod-')), 'runq.db');
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

function recentTs(offsetSeconds = 0) {
  return new Date(Date.now() - offsetSeconds * 1000).toISOString();
}

test('getProductivityReport returns a zeroed report for an empty DB', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  store.close();
  const report = getProductivityReport(db);
  assert.equal(report.totals.session_count, 0);
  assert.equal(report.totals.prompt_count, 0);
  assert.equal(report.top_frustration_sessions.length, 0);
  assert.equal(report.activity_by_day.length, 7); // default range
});

test('getProductivityReport sums totals across recent sessions', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  // A healthy session
  store.appendEvent(event('a_s', 'ses_a', 'session.started', recentTs(3600)));
  store.appendEvent(event('a_p', 'ses_a', 'user.prompt.submitted', recentTs(3590), {
    prompt_hash: 'hash_a', prompt_summary: 'fix the thing', prompt_length: 13
  }));
  store.appendEvent(event('a_e', 'ses_a', 'session.ended', recentTs(3000)));
  // Another with two prompts
  store.appendEvent(event('b_s', 'ses_b', 'session.started', recentTs(1800)));
  store.appendEvent(event('b_p1', 'ses_b', 'user.prompt.submitted', recentTs(1790), {
    prompt_hash: 'hash_b1', prompt_summary: 'do another', prompt_length: 10
  }));
  store.appendEvent(event('b_p2', 'ses_b', 'user.prompt.submitted', recentTs(1500), {
    prompt_hash: 'hash_b2', prompt_summary: 'thanks that worked', prompt_length: 18
  }));
  store.appendEvent(event('b_e', 'ses_b', 'session.ended', recentTs(1000)));
  store.close();
  const report = getProductivityReport(db);
  assert.equal(report.totals.session_count, 2);
  assert.equal(report.totals.prompt_count, 3);
  assert.ok(report.totals.total_time_ms > 0);
});

test('getProductivityReport flags sessions with frustration signals as top frustration', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  // Frustrated session: 4 prompts within seconds of each other, all same hash → triggers
  // prompt_repeated + rapid_retry_pattern in scoring/universal.js
  const sid = 'ses_frustrated';
  store.appendEvent(event(`${sid}_s`, sid, 'session.started', recentTs(120)));
  for (let i = 0; i < 4; i += 1) {
    store.appendEvent(event(`${sid}_p${i}`, sid, 'user.prompt.submitted', recentTs(120 - i * 5), {
      prompt_hash: 'hash_stuck',
      prompt_summary: 'no, that did not work, try again',
      prompt_length: 30
    }));
  }
  store.appendEvent(event(`${sid}_e`, sid, 'session.ended', recentTs(0)));
  store.close();
  const report = getProductivityReport(db);
  assert.equal(report.totals.session_count, 1);
  assert.ok(report.totals.rapid_retry_count >= 1 || report.totals.prompt_repeated_count >= 1
    || report.totals.acknowledged_negative >= 1, 'at least one frustration signal should fire');
  assert.equal(report.top_frustration_sessions.length, 1);
  assert.equal(report.top_frustration_sessions[0].session_id, sid);
});

test('getProductivityReport completion_rate = 1 when every session ends naturally', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  for (let i = 0; i < 3; i += 1) {
    const sid = `ses_${i}`;
    store.appendEvent(event(`${sid}_s`, sid, 'session.started', recentTs(100 + i * 10)));
    store.appendEvent(event(`${sid}_p`, sid, 'user.prompt.submitted', recentTs(95 + i * 10), {
      prompt_hash: `h${i}`, prompt_summary: 'do thing', prompt_length: 8
    }));
    store.appendEvent(event(`${sid}_e`, sid, 'session.ended', recentTs(50 + i * 10)));
  }
  store.close();
  const report = getProductivityReport(db);
  assert.equal(report.totals.completion_rate, 1);
  assert.equal(report.totals.abandoned_count, 0);
});

test('getProductivityReport activity_by_day always has rangeDays rows', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  store.close();
  for (const days of [3, 7, 14]) {
    const report = getProductivityReport(db, { rangeDays: days });
    assert.equal(report.activity_by_day.length, days);
  }
});

test('getProductivityReport agentId filter narrows scope', () => {
  const db = tempDb();
  const store = new RunqStore(db);
  for (const fw of ['claude_code', 'codex']) {
    const sid = `ses_${fw}`;
    store.appendEvent({ ...event(`${sid}_s`, sid, 'session.started', recentTs(60)), framework: fw });
    store.appendEvent({ ...event(`${sid}_p`, sid, 'user.prompt.submitted', recentTs(55), { prompt_hash: 'h', prompt_summary: 's', prompt_length: 1 }), framework: fw });
    store.appendEvent({ ...event(`${sid}_e`, sid, 'session.ended', recentTs(30)), framework: fw });
  }
  store.close();
  const codexOnly = getProductivityReport(db, { agentId: 'codex' });
  assert.equal(codexOnly.totals.session_count, 1);
  assert.equal(codexOnly.agent_filter, 'codex');
  const all = getProductivityReport(db);
  assert.equal(all.totals.session_count, 2);
});
