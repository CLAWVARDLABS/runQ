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
  assert.equal(score.trust_score, 90);
  assert.equal(score.trust_breakdown.verification_strength.score, 100);
  assert.equal(score.trust_breakdown.execution_quality.score >= 80, true);
  assert.equal(score.trust_breakdown.risk_exposure.score <= 20, true);
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
  assert.equal(score.trust_score <= 35, true);
  assert.equal(score.trust_breakdown.verification_strength.score <= 45, true);
  assert.equal(score.trust_breakdown.execution_quality.score <= 45, true);
  assert.equal(score.trust_breakdown.risk_exposure.score >= 65, true);
  assert.equal(score.trust_breakdown.verification_strength.reasons.includes('verification_failed_at_end'), true);
});

test('scoreRun emits a RunQ Trust Model breakdown independent of satisfaction', () => {
  const score = scoreRun([
    event('session.started'),
    event('user.prompt.submitted', { prompt_summary: 'Research competitors and draft a plan', prompt_length: 44 }),
    event('model.call.ended', { provider: 'openai', model: 'gpt-x', total_tokens: 1200 }),
    event('tool.call.ended', { tool_name: 'web_search', tool_type: 'browser_or_search', status: 'ok' }),
    event('command.ended', { binary: 'node', exit_code: 0, is_verification: true, verification_kind: 'check' }),
    event('session.ended', { ended_reason: 'completed' })
  ]);

  assert.equal(typeof score.trust_score, 'number');
  assert.deepEqual(Object.keys(score.trust_breakdown).sort(), [
    'autonomy_reliability',
    'cost_discipline',
    'evidence_strength',
    'execution_quality',
    'risk_exposure',
    'verification_strength'
  ]);
  assert.equal(score.trust_breakdown.evidence_strength.label, 'Evidence Strength');
  assert.equal(score.trust_breakdown.autonomy_reliability.reasons.includes('no_satisfaction_signal'), true);
});

test('scoreRun treats a passing verification after an earlier failure as recovered', () => {
  const score = scoreRun([
    event('file.changed', { lines_added: 1, lines_removed: 1 }),
    event('command.ended', {
      binary: 'node',
      args_hash: 'sha256:test',
      exit_code: 1,
      is_verification: true,
      verification_kind: 'test'
    }, '2026-05-02T10:00:01.000Z'),
    event('command.ended', {
      binary: 'node',
      args_hash: 'sha256:test',
      exit_code: 0,
      is_verification: true,
      verification_kind: 'test'
    }, '2026-05-02T10:00:02.000Z'),
    event('session.ended', { ended_reason: 'completed' }, '2026-05-02T10:00:03.000Z')
  ]);

  assert.equal(score.outcome_confidence, 0.9);
  assert.equal(score.verification_coverage, 1);
  assert.equal(score.rework_risk, 0.1);
  assert.equal(score.reasons.includes('verification_passed_after_changes'), true);
  assert.equal(score.reasons.includes('verification_failed_at_end'), false);
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

test('scoreRun raises confidence when the run has an accepted satisfaction signal', () => {
  const score = scoreRun([
    event('session.started'),
    event('model.call.ended', {
      provider: 'clawvard-token',
      model: 'MiniMax-M2.7',
      total_tokens: 18976
    }),
    event('session.ended', { ended_reason: 'agent_end', success: true }),
    event('satisfaction.recorded', {
      label: 'accepted',
      signal: 'smoke_test_exact_reply',
      confidence: 0.95
    })
  ]);

  assert.equal(score.outcome_confidence, 0.85);
  assert.equal(score.rework_risk, 0.2);
  assert.equal(score.reasons.includes('satisfaction_accepted'), true);
});

test('scoreRun lowers confidence when the latest satisfaction signal is abandoned', () => {
  const score = scoreRun([
    event('session.started'),
    event('session.ended', { ended_reason: 'agent_end', success: false }),
    event('satisfaction.recorded', {
      label: 'abandoned',
      signal: 'model request timed out',
      confidence: 0.9
    })
  ]);

  assert.equal(score.outcome_confidence, 0.15);
  assert.equal(score.rework_risk, 0.85);
  assert.equal(score.reasons.includes('satisfaction_abandoned'), true);
});

test('scoreRun handles corrected, rerun, and escalated satisfaction labels', () => {
  const corrected = scoreRun([
    event('file.changed', { lines_added: 10 }),
    event('command.ended', { binary: 'npm', exit_code: 0, is_verification: true }),
    event('satisfaction.recorded', { label: 'corrected', signal: 'user manually fixed the output' })
  ]);
  const rerun = scoreRun([
    event('session.ended', { ended_reason: 'completed' }),
    event('satisfaction.recorded', { label: 'rerun', signal: 'user launched another agent pass' })
  ]);
  const escalated = scoreRun([
    event('session.ended', { ended_reason: 'completed' }),
    event('satisfaction.recorded', { label: 'escalated', signal: 'human took over' })
  ]);

  assert.equal(corrected.outcome_confidence, 0.55);
  assert.equal(corrected.rework_risk, 0.65);
  assert.equal(corrected.reasons.includes('satisfaction_corrected'), true);
  assert.equal(rerun.outcome_confidence, 0.35);
  assert.equal(rerun.reasons.includes('satisfaction_rerun'), true);
  assert.equal(escalated.outcome_confidence, 0.25);
  assert.equal(escalated.reasons.includes('satisfaction_escalated'), true);
});
