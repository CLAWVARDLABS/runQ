import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { runV02ReleaseCheck } from '../src/release-check.js';

const releaseCheckPath = new URL('../scripts/release-check.mjs', import.meta.url).pathname;

test('runV02ReleaseCheck proves every v0.2 local-alpha product scenario', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-release-check-'));
  const report = runV02ReleaseCheck({
    dbPath: join(dir, 'runq.db'),
    workDir: join(dir, 'work'),
    now: '2026-05-03T14:00:00.000Z'
  });

  assert.equal(report.runq_version, '0.2.0');
  assert.equal(report.ok, true);
  assert.equal(report.checks.every((check) => check.ok), true);
  assert.equal(report.scenarios.openclaw_verified_success.quality.outcome_confidence, 0.9);
  assert.equal(report.scenarios.openclaw_repeated_failure.recommendation_categories.includes('verification_strategy'), true);
  assert.equal(report.scenarios.openclaw_repeated_failure.recommendation_categories.includes('loop_prevention'), true);
  assert.deepEqual(report.scenarios.coding_task_recovery.command_statuses, [1, 0]);
  assert.equal(report.scenarios.coding_task_recovery.quality.outcome_confidence, 0.9);
  assert.equal(report.scenarios.coding_task_recovery.recommendation_categories.length, 0);
  assert.equal(report.readiness.sessions.total, 3);
  assert.equal(report.readiness.sessions.usable_timeline_percent, 1);
  assert.equal(report.readiness.redaction.secret_like_payload_findings.length, 0);
  assert.equal(existsSync(join(dir, 'work/coding-task-repo/src/cart.js')), true);
});

test('release-check CLI prints JSON and exits successfully when v0.2 acceptance passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-release-check-cli-'));
  const result = spawnSync(process.execPath, [
    releaseCheckPath,
    '--db',
    join(dir, 'runq.db'),
    '--work-dir',
    join(dir, 'work'),
    '--now',
    '2026-05-03T15:00:00.000Z'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.checks.length, 6);
  assert.equal(report.readiness.criteria.redaction_findings.ok, true);
});
