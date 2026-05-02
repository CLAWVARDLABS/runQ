import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreRun } from '../src/scoring.js';

function event(eventType, payload = {}, timestamp = '2026-05-02T10:00:00.000Z') {
  return {
    runq_version: '0.1.0',
    event_id: `evt_${eventType}_${Math.random().toString(16).slice(2)}`,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp,
    session_id: 'ses_score_1',
    run_id: 'run_score_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload
  };
}

test('scoreRun gives high confidence when verification passes after file changes', () => {
  const score = scoreRun([
    event('session.started'),
    event('file.changed', { lines_added: 12, lines_removed: 3 }),
    event('command.ended', {
      binary: 'npm',
      exit_code: 0,
      is_verification: true,
      verification_kind: 'test'
    }),
    event('session.ended', { ended_reason: 'completed' })
  ]);

  assert.equal(score.outcome_confidence, 0.9);
  assert.equal(score.verification_coverage, 1);
  assert.equal(score.rework_risk, 0.1);
  assert.equal(score.reasons.includes('verification_passed_after_changes'), true);
});

test('scoreRun lowers confidence when tests fail at session end', () => {
  const score = scoreRun([
    event('file.changed', { lines_added: 20 }),
    event('command.ended', {
      binary: 'npm',
      exit_code: 1,
      is_verification: true,
      verification_kind: 'test'
    }),
    event('session.ended', { ended_reason: 'completed' })
  ]);

  assert.equal(score.outcome_confidence, 0.2);
  assert.equal(score.verification_coverage, 0.4);
  assert.equal(score.rework_risk, 0.8);
  assert.equal(score.reasons.includes('verification_failed_at_end'), true);
});

test('scoreRun detects permission friction from repeated wait time', () => {
  const score = scoreRun([
    event('permission.resolved', { wait_ms: 10_000, decision: 'allow' }),
    event('permission.resolved', { wait_ms: 20_000, decision: 'allow' }),
    event('permission.resolved', { wait_ms: 15_000, decision: 'allow' })
  ]);

  assert.equal(score.permission_friction, 0.75);
  assert.equal(score.reasons.includes('high_permission_wait'), true);
});

test('scoreRun detects command loops from repeated failing commands', () => {
  const repeatedFailure = {
    binary: 'npm',
    args_hash: 'sha256:same',
    exit_code: 1,
    is_verification: true
  };
  const score = scoreRun([
    event('command.ended', repeatedFailure),
    event('command.ended', repeatedFailure),
    event('command.ended', repeatedFailure)
  ]);

  assert.equal(score.loop_risk, 0.8);
  assert.equal(score.outcome_confidence, 0.25);
  assert.equal(score.reasons.includes('repeated_command_failure'), true);
});
