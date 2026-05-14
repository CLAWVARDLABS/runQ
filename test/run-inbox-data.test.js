import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getRunInboxSessions, getRunInboxEvents } from '../src/run-inbox-data.js';
import { setPrivacyMode } from '../src/config.js';
import { RunqStore } from '../src/store.js';

function event(sessionId, eventId, eventType, timestamp, payload = {}) {
  return {
    runq_version: '0.1.0',
    event_id: eventId,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: sessionId,
    run_id: `run_${sessionId}`,
    framework: 'openclaw',
    source: 'hook',
    privacy: { level: 'metadata', redacted: true },
    payload
  };
}

test('getRunInboxSessions annotates accepted recommendations with follow-up impact', () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'runq-data-')), 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(event('ses_failed', 'evt_failed_start', 'session.started', '2026-05-02T10:00:00.000Z'));
  store.appendEvent(event('ses_failed', 'evt_failed_file', 'file.changed', '2026-05-02T10:01:00.000Z'));
  store.appendEvent(event('ses_failed', 'evt_failed_test', 'command.ended', '2026-05-02T10:02:00.000Z', {
    binary: 'npm',
    args_hash: 'sha256:test',
    exit_code: 1,
    is_verification: true
  }));
  store.appendEvent(event('ses_failed', 'evt_failed_end', 'session.ended', '2026-05-02T10:03:00.000Z'));
  store.appendEvent(event('ses_failed', 'evt_accept_rec', 'recommendation.accepted', '2026-05-02T10:04:00.000Z', {
    recommendation_id: 'rec_verification_strategy'
  }));
  store.appendEvent(event('ses_followup', 'evt_followup_start', 'session.started', '2026-05-02T11:00:00.000Z'));
  store.appendEvent(event('ses_followup', 'evt_followup_test', 'command.ended', '2026-05-02T11:01:00.000Z', {
    binary: 'npm',
    args_hash: 'sha256:test',
    exit_code: 0,
    is_verification: true
  }));
  store.appendEvent(event('ses_followup', 'evt_followup_done', 'satisfaction.recorded', '2026-05-02T11:02:00.000Z', {
    label: 'accepted'
  }));
  store.close();

  const sessions = getRunInboxSessions(dbPath);
  const failed = sessions.find((session) => session.session_id === 'ses_failed');
  const recommendation = failed.recommendations.find((rec) => rec.recommendation_id === 'rec_verification_strategy');
  assert.equal(recommendation.impact.status, 'verified');
  assert.equal(recommendation.impact.followup_count, 1);
  assert.equal(recommendation.impact.verified_session_ids.includes('ses_followup'), true);
});

test('getRunInboxSessions caches metrics and recomputes when session events change', () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'runq-data-cache-')), 'runq.db');
  const store = new RunqStore(dbPath);
  store.appendEvent(event('ses_cache', 'evt_cache_start', 'session.started', '2026-05-02T10:00:00.000Z'));
  store.appendEvent(event('ses_cache', 'evt_cache_file', 'file.changed', '2026-05-02T10:00:30.000Z'));
  store.appendEvent(event('ses_cache', 'evt_cache_test', 'command.ended', '2026-05-02T10:01:00.000Z', {
    binary: 'npm',
    exit_code: 0,
    is_verification: true
  }));
  store.close();

  const first = getRunInboxSessions(dbPath).find((session) => session.session_id === 'ses_cache');
  assert.equal(first.quality.trust_score >= 80, true);

  const cacheStore = new RunqStore(dbPath);
  const cached = cacheStore.getSessionMetrics('ses_cache');
  assert.equal(cached.event_count, 3);
  cacheStore.upsertSessionMetrics('ses_cache', {
    event_count: cached.event_count,
    last_event_at: cached.last_event_at,
    metrics: {
      quality: { trust_score: 7, outcome_confidence: 0.07, reasons: ['cached_marker'] },
      recommendations: [],
      satisfaction: null,
      telemetry: { verification_count: 0 }
    }
  });
  cacheStore.close();

  const reused = getRunInboxSessions(dbPath).find((session) => session.session_id === 'ses_cache');
  assert.equal(reused.quality.trust_score, 7);
  assert.deepEqual(reused.quality.reasons, ['cached_marker']);

  const appendStore = new RunqStore(dbPath);
  appendStore.appendEvent(event('ses_cache', 'evt_cache_done', 'satisfaction.recorded', '2026-05-02T10:02:00.000Z', {
    label: 'accepted'
  }));
  appendStore.close();

  const recomputed = getRunInboxSessions(dbPath).find((session) => session.session_id === 'ses_cache');
  assert.notEqual(recomputed.quality.trust_score, 7);
  assert.equal(recomputed.event_count, 4);
});


test('getRunInboxSessions populates prompt_snippets from user.prompt.submitted events', () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'runq-data-snippet-')), 'runq.db');
  const store = new RunqStore(dbPath);

  store.appendEvent(event('ses_cache_api', 'evt_a_start', 'session.started', '2026-05-02T09:00:00.000Z'));
  store.appendEvent(event('ses_cache_api', 'evt_a_prompt1', 'user.prompt.submitted', '2026-05-02T09:00:30.000Z', {
    prompt_summary: '帮我给路由模块加上缓存层',
    prompt_length: 13
  }));
  store.appendEvent(event('ses_cache_api', 'evt_a_prompt2', 'user.prompt.submitted', '2026-05-02T09:05:00.000Z', {
    prompt_summary: '顺便把日志格式化也修一下',
    prompt_length: 13
  }));

  store.appendEvent(event('ses_other', 'evt_b_start', 'session.started', '2026-05-02T10:00:00.000Z'));
  store.appendEvent(event('ses_other', 'evt_b_prompt', 'user.prompt.submitted', '2026-05-02T10:00:30.000Z', {
    prompt_summary: '重构 README 文档',
    prompt_length: 11
  }));
  store.close();

  const sessions = getRunInboxSessions(dbPath);
  const a = sessions.find((s) => s.session_id === 'ses_cache_api');
  const b = sessions.find((s) => s.session_id === 'ses_other');

  assert.deepEqual(a.prompt_snippets, [
    '帮我给路由模块加上缓存层',
    '顺便把日志格式化也修一下'
  ]);
  assert.deepEqual(b.prompt_snippets, ['重构 README 文档']);

  // Sanity: snippets are searchable substrings — case-insensitive lower-case match
  // succeeds for the right session only.
  const matches = (session, q) => session.prompt_snippets.some((s) => s.toLowerCase().includes(q.toLowerCase()));
  assert.equal(matches(a, '缓存'), true);
  assert.equal(matches(b, '缓存'), false);
  assert.equal(matches(b, 'readme'), true);
});

test('getRunInboxEvents strips raw payload fields on read when privacy mode is on', () => {
  const runqDir = join(mkdtempSync(join(tmpdir(), 'runq-data-privacy-')), '.runq');
  mkdirSync(runqDir, { recursive: true });
  const dbPath = join(runqDir, 'runq.db');

  // Capture an event WITH raw content (as if privacy mode was off at capture).
  const store = new RunqStore(dbPath, { redactionPolicy: { disabled: true } });
  store.appendEvent(event('ses_priv', 'evt_priv_prompt', 'user.prompt.submitted', '2026-05-02T09:00:00.000Z', {
    prompt: 'leak the database password',
    prompt_length: 26,
    prompt_hash: 'sha256:abc'
  }));
  store.appendEvent(event('ses_priv', 'evt_priv_cmd', 'command.ended', '2026-05-02T09:01:00.000Z', {
    command: 'cat .env',
    cwd: '/repo',
    output: 'DB_PASSWORD=hunter2',
    exit_code: 0,
    binary: 'cat'
  }));
  store.close();

  // privacy off (default) → raw fields come through untouched
  setPrivacyMode('off', dbPath);
  const rawEvents = getRunInboxEvents('ses_priv', dbPath);
  const rawPrompt = rawEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(rawPrompt.payload.prompt, 'leak the database password');

  // privacy on → raw-content keys stripped at read time, metadata kept
  setPrivacyMode('on', dbPath);
  const safeEvents = getRunInboxEvents('ses_priv', dbPath);
  const safePrompt = safeEvents.find((e) => e.event_type === 'user.prompt.submitted');
  assert.equal(safePrompt.payload.prompt, undefined);
  assert.equal(safePrompt.payload.prompt_length, 26);
  assert.equal(safePrompt.payload.prompt_hash, 'sha256:abc');
  assert.equal(safePrompt.privacy.level, 'metadata');
  assert.equal(safePrompt.privacy.redacted, true);
  const safeCmd = safeEvents.find((e) => e.event_type === 'command.ended');
  assert.equal(safeCmd.payload.command, undefined);
  assert.equal(safeCmd.payload.cwd, undefined);
  assert.equal(safeCmd.payload.output, undefined);
  assert.equal(safeCmd.payload.exit_code, 0);
  assert.equal(safeCmd.payload.binary, 'cat');
});
