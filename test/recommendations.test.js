import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendRunImprovements } from '../src/recommendations.js';

function event(eventId, eventType, payload = {}) {
  return {
    runq_version: '0.1.0',
    event_id: eventId,
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp: '2026-05-02T10:00:00.000Z',
    session_id: 'ses_reco_1',
    run_id: 'run_reco_1',
    framework: 'claude_code',
    source: 'hook',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload
  };
}

test('recommendRunImprovements suggests allowlist for repeated safe read-only approvals', () => {
  const recommendations = recommendRunImprovements([
    event('evt_perm_1', 'permission.resolved', { decision: 'allow', wait_ms: 10_000, resource_kind: 'command', binary: 'rg' }),
    event('evt_perm_2', 'permission.resolved', { decision: 'allow', wait_ms: 12_000, resource_kind: 'command', binary: 'git' }),
    event('evt_perm_3', 'permission.resolved', { decision: 'allow', wait_ms: 8_000, resource_kind: 'command', binary: 'sed' })
  ]);

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].category, 'permission_policy');
  assert.equal(recommendations[0].evidence_event_ids.length, 3);
  assert.match(recommendations[0].title, /read-only command allowlist/);
});

test('recommendRunImprovements suggests verification strategy when changes end with failed tests', () => {
  const recommendations = recommendRunImprovements([
    event('evt_file', 'file.changed', { lines_added: 30 }),
    event('evt_test', 'command.ended', {
      binary: 'npm',
      exit_code: 1,
      is_verification: true
    }),
    event('evt_end', 'session.ended', { ended_reason: 'completed' })
  ]);

  assert.equal(recommendations[0].category, 'verification_strategy');
  assert.equal(recommendations[0].evidence_event_ids.includes('evt_test'), true);
});

test('recommendRunImprovements suggests repo instructions when code changes have no verification', () => {
  const recommendations = recommendRunImprovements([
    event('evt_file', 'file.changed', { lines_added: 30 }),
    event('evt_end', 'session.ended', { ended_reason: 'completed' })
  ]);

  assert.equal(recommendations[0].category, 'repo_instruction');
  assert.match(recommendations[0].suggested_action, /AGENTS.md|CLAUDE.md|Codex/);
});

test('recommendRunImprovements suggests loop prevention for repeated command failures', () => {
  const failed = {
    binary: 'npm',
    args_hash: 'sha256:same',
    exit_code: 1
  };
  const recommendations = recommendRunImprovements([
    event('evt_cmd_1', 'command.ended', failed),
    event('evt_cmd_2', 'command.ended', failed),
    event('evt_cmd_3', 'command.ended', failed)
  ]);

  assert.equal(recommendations[0].category, 'loop_prevention');
  assert.equal(recommendations[0].evidence_event_ids.length, 3);
});

test('recommendRunImprovements suggests workspace targeting when a run searches broadly and ends abandoned', () => {
  const recommendations = recommendRunImprovements([
    event('evt_find', 'command.ended', {
      binary: 'find',
      args_hash: 'sha256:find-home',
      exit_code: 0,
      is_verification: false
    }),
    event('evt_ls', 'command.ended', {
      binary: 'ls',
      args_hash: 'sha256:ls-workspace',
      exit_code: 0,
      is_verification: false
    }),
    event('evt_end', 'session.ended', {
      ended_reason: 'error',
      duration_ms: 600000
    }),
    event('evt_satisfaction', 'satisfaction.recorded', {
      label: 'abandoned'
    })
  ]);

  assert.equal(recommendations.some((item) => item.category === 'task_sizing'), true);
});
