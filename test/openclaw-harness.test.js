import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import {
  createOpenClawHarnessSnapshot,
  runOpenClawHarness
} from '../examples/openclaw-harness/run.js';

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
  assert.equal(result.events.some((event) => event.event_type === 'satisfaction.recorded'), true);
  assert.equal(result.events.some((event) => event.event_type === 'file.changed'), true);
  assert.equal(result.quality.outcome_confidence, 0.9);
  assert.equal(result.quality.reasons.includes('verification_passed_after_changes'), true);
  assert.equal(result.recommendations.length, 0);
  assert.equal(result.satisfaction.label, 'accepted');
});

test('OpenClaw harness records repeated failed verification and emits product recommendations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-'));
  const result = runOpenClawHarness({
    dbPath: join(dir, 'runq.db'),
    scenario: 'repeated-test-failure',
    now: '2026-05-03T03:00:00.000Z'
  });

  assert.equal(result.session.session_id, 'openclaw-harness-failure');
  assert.equal(result.events.some((event) => event.event_type === 'satisfaction.recorded'), true);
  assert.equal(result.quality.outcome_confidence, 0.15);
  assert.equal(result.quality.loop_risk, 0.8);
  assert.equal(result.quality.reasons.includes('verification_failed_at_end'), true);
  assert.equal(result.quality.reasons.includes('repeated_command_failure'), true);
  assert.equal(result.quality.reasons.includes('satisfaction_abandoned'), true);
  assert.equal(result.recommendations.some((recommendation) => recommendation.category === 'verification_strategy'), true);
  assert.equal(result.recommendations.some((recommendation) => recommendation.category === 'loop_prevention'), true);
  assert.equal(result.satisfaction.label, 'abandoned');
});

test('OpenClaw harness returns the scenario session when the database already contains other runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-multi-'));
  const dbPath = join(dir, 'runq.db');

  runOpenClawHarness({
    dbPath,
    scenario: 'repeated-test-failure',
    now: '2026-05-03T05:00:00.000Z'
  });
  const result = runOpenClawHarness({
    dbPath,
    scenario: 'verified-success',
    now: '2026-05-03T04:00:00.000Z'
  });

  assert.equal(result.session.session_id, 'openclaw-harness-success');
  assert.equal(result.quality.outcome_confidence, 0.9);
  assert.equal(result.satisfaction.label, 'accepted');
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
  assert.equal(report.satisfaction.label, 'abandoned');
  assert.equal(report.quality.loop_risk, 0.8);
  assert.equal(report.recommendations.some((recommendation) => recommendation.category === 'loop_prevention'), true);
});

test('OpenClaw harness product snapshot matches the verified-success golden file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-golden-'));
  const result = runOpenClawHarness({
    dbPath: join(dir, 'runq.db'),
    scenario: 'verified-success',
    now: '2026-05-03T05:00:00.000Z'
  });
  const expected = JSON.parse(readFileSync(new URL('../examples/openclaw-harness/golden/verified-success.json', import.meta.url), 'utf8'));

  assert.deepEqual(createOpenClawHarnessSnapshot(result), expected);
});

test('OpenClaw harness product snapshot matches the repeated-test-failure golden file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-openclaw-harness-golden-'));
  const result = runOpenClawHarness({
    dbPath: join(dir, 'runq.db'),
    scenario: 'repeated-test-failure',
    now: '2026-05-03T06:00:00.000Z'
  });
  const expected = JSON.parse(readFileSync(new URL('../examples/openclaw-harness/golden/repeated-test-failure.json', import.meta.url), 'utf8'));

  assert.deepEqual(createOpenClawHarnessSnapshot(result), expected);
});
