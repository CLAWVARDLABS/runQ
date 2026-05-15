import test from 'node:test';
import assert from 'node:assert/strict';

import { compareRuns } from '../src/compare-runs.js';

function event(eventId, type, ts, payload = {}) {
  return { event_id: eventId, event_type: type, timestamp: ts, payload };
}

test('compareRuns folds a fully-shared trajectory into common_prefix', () => {
  const events = [
    event('e1', 'user.prompt.submitted', '2026-05-10T10:00:00.000Z', { prompt_hash: 'sha256:abc' }),
    event('e2', 'model.call.ended', '2026-05-10T10:00:05.000Z', { model: 'gpt-5' }),
    event('e3', 'tool.call.started', '2026-05-10T10:00:10.000Z', { tool_name: 'Read' }),
    event('e4', 'tool.call.ended', '2026-05-10T10:00:12.000Z', { tool_name: 'Read', status: 'ok' })
  ];
  const diff = compareRuns(events, events);
  assert.equal(diff.diverged, false);
  assert.equal(diff.common_prefix_length, 4);
});

test('compareRuns identifies the first divergence point by signature', () => {
  const left = [
    event('l1', 'user.prompt.submitted', '2026-05-10T10:00:00.000Z', { prompt_hash: 'h1' }),
    event('l2', 'model.call.ended', '2026-05-10T10:00:05.000Z', { model: 'claude-opus' }),
    event('l3', 'tool.call.started', '2026-05-10T10:00:10.000Z', { tool_name: 'Read' }),
    event('l4', 'tool.call.started', '2026-05-10T10:00:15.000Z', { tool_name: 'Bash' })
  ];
  const right = [
    event('r1', 'user.prompt.submitted', '2026-05-10T10:00:00.000Z', { prompt_hash: 'h1' }),
    event('r2', 'model.call.ended', '2026-05-10T10:00:05.000Z', { model: 'claude-opus' }),
    event('r3', 'tool.call.started', '2026-05-10T10:00:10.000Z', { tool_name: 'Read' }),
    event('r4', 'tool.call.started', '2026-05-10T10:00:15.000Z', { tool_name: 'Edit' })
  ];
  const diff = compareRuns(left, right);
  assert.equal(diff.diverged, true);
  // First 3 steps share signatures (prompt + same model + same first tool).
  assert.equal(diff.common_prefix_length, 3);
});

test('compareRuns surfaces tool/verification/file counts in stats', () => {
  const events = [
    event('a', 'tool.call.started', '2026-05-10T10:00:00.000Z', { tool_name: 'Bash' }),
    event('b', 'tool.call.ended', '2026-05-10T10:00:01.000Z', { tool_name: 'Bash', status: 'ok' }),
    event('c', 'command.ended', '2026-05-10T10:00:02.000Z', { binary: 'npm', is_verification: true, exit_code: 1 }),
    event('d', 'file.changed', '2026-05-10T10:00:03.000Z', { file_extension: 'js', change_kind: 'modified' })
  ];
  const diff = compareRuns(events, events);
  assert.equal(diff.left.stats.commands, 1);
  assert.equal(diff.left.stats.verifications, 1);
  assert.equal(diff.left.stats.verification_failed, 1);
  assert.equal(diff.left.stats.file_changes, 1);
  assert.equal(diff.left.stats.distinct_tools, 1);
});

test('compareRuns strips session lifecycle + outcome.scored from actions', () => {
  const events = [
    event('s', 'session.started', '2026-05-10T10:00:00.000Z'),
    event('p', 'user.prompt.submitted', '2026-05-10T10:00:01.000Z', { prompt_hash: 'h' }),
    event('e', 'session.ended', '2026-05-10T10:00:10.000Z'),
    event('o', 'outcome.scored', '2026-05-10T10:00:10.001Z', { trust_score: 80 })
  ];
  const diff = compareRuns(events, events);
  assert.equal(diff.left.actions.length, 1);
  assert.equal(diff.left.actions[0].event_type, 'user.prompt.submitted');
});

test('compareRuns handles one-sided empty runs without throwing', () => {
  const events = [event('p', 'user.prompt.submitted', '2026-05-10T10:00:00.000Z')];
  const diff = compareRuns(events, []);
  assert.equal(diff.diverged, true);
  assert.equal(diff.common_prefix_length, 0);
  assert.equal(diff.right.actions.length, 0);
});

test('compareRuns includes the leftSession trust_score when supplied', () => {
  const events = [event('p', 'user.prompt.submitted', '2026-05-10T10:00:00.000Z')];
  const diff = compareRuns(events, events, {
    leftSession: { session_id: 'ses_a', quality: { trust_score: 88 } },
    rightSession: { session_id: 'ses_b', quality: { trust_score: 42 } }
  });
  assert.equal(diff.left.trust_score, 88);
  assert.equal(diff.right.trust_score, 42);
  assert.equal(diff.left.session_id, 'ses_a');
});
