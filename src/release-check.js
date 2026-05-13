import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runOpenClawHarness } from '../examples/openclaw-harness/run.js';
import { runCodingTaskHarness } from '../examples/coding-task-harness/run.js';
import { createReadinessReport } from './readiness.js';

function timestamp(base, offsetSeconds) {
  return new Date(Date.parse(base) + offsetSeconds * 1000).toISOString();
}

function check(id, ok, summary, details = {}) {
  return {
    id,
    ok,
    summary,
    details
  };
}

function scenarioSummary(result) {
  return {
    session_id: result.session.session_id,
    event_count: result.events.length,
    satisfaction_label: result.satisfaction.label,
    quality: result.quality,
    recommendation_categories: result.recommendations.map((recommendation) => recommendation.category)
  };
}

export function runV02ReleaseCheck({
  dbPath,
  workDir,
  now = new Date().toISOString()
} = {}) {
  const defaultDir = mkdtempSync(join(tmpdir(), 'runq-v02-release-check-'));
  const resolvedDbPath = dbPath ?? join(defaultDir, 'runq.db');
  const resolvedWorkDir = workDir ?? join(defaultDir, 'work');

  const openclawVerifiedSuccess = runOpenClawHarness({
    dbPath: resolvedDbPath,
    scenario: 'verified-success',
    now: timestamp(now, 0)
  });
  const openclawRepeatedFailure = runOpenClawHarness({
    dbPath: resolvedDbPath,
    scenario: 'repeated-test-failure',
    now: timestamp(now, 60)
  });
  const codingTaskRecovery = runCodingTaskHarness({
    dbPath: resolvedDbPath,
    repoDir: join(resolvedWorkDir, 'coding-task-repo'),
    now: timestamp(now, 120)
  });
  const readiness = createReadinessReport({ dbPath: resolvedDbPath });

  const openclawFailureCategories = openclawRepeatedFailure.recommendations.map((recommendation) => recommendation.category);
  const codingTaskCategories = codingTaskRecovery.recommendations.map((recommendation) => recommendation.category);
  const checks = [
    check(
      'openclaw_verified_success',
      (openclawVerifiedSuccess.quality.trust_score || openclawVerifiedSuccess.quality.outcome_confidence * 100) >= 90 &&
        openclawVerifiedSuccess.satisfaction.label === 'accepted',
      'OpenClaw verified-success harness scores accepted verified work as high trust.',
      {
        trust_score: openclawVerifiedSuccess.quality.trust_score,
        outcome_confidence: openclawVerifiedSuccess.quality.outcome_confidence,
        satisfaction_label: openclawVerifiedSuccess.satisfaction.label
      }
    ),
    check(
      'openclaw_repeated_failure',
      openclawRepeatedFailure.quality.loop_risk >= 0.8 &&
        openclawFailureCategories.includes('verification_strategy') &&
        openclawFailureCategories.includes('loop_prevention'),
      'OpenClaw repeated-failure harness surfaces verification and loop-prevention recommendations.',
      {
        loop_risk: openclawRepeatedFailure.quality.loop_risk,
        recommendation_categories: openclawFailureCategories
      }
    ),
    check(
      'coding_task_recovery',
      codingTaskRecovery.commands[0].status !== 0 &&
        codingTaskRecovery.commands[1].status === 0 &&
        (codingTaskRecovery.quality.trust_score || codingTaskRecovery.quality.outcome_confidence * 100) >= 90 &&
        codingTaskCategories.length === 0,
      'Coding-task harness recognizes early failed verification recovered by a later passing verification.',
      {
        command_statuses: codingTaskRecovery.commands.map((command) => command.status),
        trust_score: codingTaskRecovery.quality.trust_score,
        outcome_confidence: codingTaskRecovery.quality.outcome_confidence,
        recommendation_categories: codingTaskCategories
      }
    ),
    check(
      'local_session_count',
      readiness.sessions.total >= 3,
      'Release check records the minimum v0.2 local-alpha scenario set.',
      {
        sessions: readiness.sessions.total
      }
    ),
    check(
      'usable_timeline_percent',
      readiness.sessions.usable_timeline_percent >= 0.8,
      'At least 80 percent of release-check sessions reconstruct usable timelines.',
      {
        usable_timeline_percent: readiness.sessions.usable_timeline_percent,
        usable_timeline_count: readiness.sessions.usable_timeline_count
      }
    ),
    check(
      'redaction_findings',
      readiness.redaction.secret_like_payload_findings.length === 0,
      'Default metadata mode has zero secret-like payload findings.',
      {
        secret_like_payload_findings: readiness.redaction.secret_like_payload_findings.length
      }
    )
  ];

  return {
    runq_version: '0.2.0',
    generated_at: new Date().toISOString(),
    ok: checks.every((item) => item.ok),
    db_path: resolvedDbPath,
    work_dir: resolvedWorkDir,
    checks,
    scenarios: {
      openclaw_verified_success: scenarioSummary(openclawVerifiedSuccess),
      openclaw_repeated_failure: scenarioSummary(openclawRepeatedFailure),
      coding_task_recovery: {
        ...scenarioSummary(codingTaskRecovery),
        command_statuses: codingTaskRecovery.commands.map((command) => command.status)
      }
    },
    readiness
  };
}
