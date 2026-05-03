import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { runOpenClawHarness } from '../examples/openclaw-harness/run.js';

const harnessPath = new URL('../examples/openclaw-harness/run.js', import.meta.url).pathname;

test('OpenClaw harness records a verified successful coding-agent run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-'));
  const result = runOpenClawHarness({
    dbPath: join(dir, 'runq.db'),
    scenario: 'verified-success',
    now: '2026-05-03T02:00:00.000Z'
  });

  assert.equal(result.session.session_id, 'openclaw-harness-success');
  assert.equal(result.session.framework, 'openclaw');
  assert.equal(result.events.some((event) => event.event_type === 'file.changed'), true);
  assert.equal(result.quality.outcome_confidence, 0.9);
  assert.equal(result.quality.reasons.includes('verification_passed_after_changes'), true);
  assert.equal(result.recommendations.length, 0);
});

test('OpenClaw harness records repeated failed verification and emits product recommendations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-'));
  const result = runOpenClawHarness({
    dbPath: join(dir, 'runq.db'),
    scenario: 'repeated-test-failure',
    now: '2026-05-03T03:00:00.000Z'
  });

  assert.equal(result.session.session_id, 'openclaw-harness-failure');
  assert.equal(result.quality.outcome_confidence, 0.2);
  assert.equal(result.quality.loop_risk, 0.8);
  assert.equal(result.quality.reasons.includes('verification_failed_at_end'), true);
  assert.equal(result.quality.reasons.includes('repeated_command_failure'), true);
  assert.equal(result.recommendations.some((recommendation) => recommendation.category === 'verification_strategy'), true);
  assert.equal(result.recommendations.some((recommendation) => recommendation.category === 'loop_prevention'), true);
});

test('OpenClaw harness CLI prints a JSON quality report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-cli-'));
  const result = spawnSync(process.execPath, [
    harnessPath,
    '--scenario',
    'repeated-test-failure',
    '--db',
    join(dir, 'runq.db'),
    '--now',
    '2026-05-03T04:00:00.000Z'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.session_id, 'openclaw-harness-failure');
  assert.equal(report.quality.loop_risk, 0.8);
  assert.equal(report.recommendations.some((recommendation) => recommendation.category === 'loop_prevention'), true);
});
