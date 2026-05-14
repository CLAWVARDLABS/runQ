import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { getRunInboxSessions } from '../src/run-inbox-data.js';
import { createReadinessReport } from '../src/readiness.js';
import { runCodingTaskHarness } from '../examples/coding-task-harness/run.js';

const harnessPath = new URL('../examples/coding-task-harness/run.js', import.meta.url).pathname;

test('coding task harness records a real failing-then-passing bugfix run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-coding-task-harness-'));
  const dbPath = join(dir, 'runq.db');
  const repoDir = join(dir, 'repo');

  const result = runCodingTaskHarness({
    dbPath,
    repoDir,
    now: '2026-05-03T12:00:00.000Z'
  });

  assert.equal(existsSync(join(repoDir, 'src/cart.js')), true);
  assert.equal(result.commands[0].status, 1);
  assert.equal(result.commands[1].status, 0);
  assert.equal(result.quality.outcome_confidence, 0.96);
  assert.equal(result.quality.verification_coverage, 1);
  assert.equal(result.quality.reasons.includes('verification_passed_after_changes'), true);
  assert.equal(result.satisfaction.label, 'accepted');
  assert.deepEqual(result.events.map((event) => event.event_type), [
    'session.started',
    'user.prompt.submitted',
    'command.started',
    'command.ended',
    'file.changed',
    'git.diff.summarized',
    'command.started',
    'command.ended',
    'session.ended',
    'satisfaction.recorded'
  ]);

  const sessions = getRunInboxSessions(dbPath);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].quality.outcome_confidence, 0.96);
  assert.equal(sessions[0].satisfaction.label, 'accepted');

  const readiness = createReadinessReport({ dbPath });
  assert.equal(readiness.sessions.usable_timeline_count, 1);
  assert.equal(readiness.redaction.secret_like_payload_findings.length, 0);
});

test('coding task harness CLI prints a JSON quality report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-coding-task-harness-cli-'));
  const result = spawnSync(process.execPath, [
    harnessPath,
    '--db',
    join(dir, 'runq.db'),
    '--repo',
    join(dir, 'repo'),
    '--now',
    '2026-05-03T13:00:00.000Z'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.session_id, 'coding-task-harness-bugfix');
  assert.equal(report.commands.map((command) => command.status).join(','), '1,0');
  assert.equal(report.quality.outcome_confidence, 0.96);
});
