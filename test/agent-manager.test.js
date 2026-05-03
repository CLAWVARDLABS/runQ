import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { getRunInboxSessions } from '../src/run-inbox-data.js';
import { runAgentManager } from '../tools/agent-manager/manager.js';

const runnerPath = new URL('../tools/agent-manager/agent-runner.js', import.meta.url).pathname;

test('agent-runner writes a RunQ event artifact for one scenario', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-agent-runner-'));
  const outPath = join(dir, 'agent-success.json');
  const result = spawnSync(process.execPath, [
    runnerPath,
    '--scenario',
    'verified-success',
    '--agent-id',
    'agent-success',
    '--out',
    outPath,
    '--now',
    '2026-05-03T10:00:00.000Z'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(outPath), true);
  const events = JSON.parse(readFileSync(outPath, 'utf8'));

  assert.equal(Array.isArray(events), true);
  assert.equal(events[0].session_id, 'agent-success-openclaw-harness-success');
  assert.equal(events.some((event) => event.event_type === 'satisfaction.recorded'), true);
});

test('runAgentManager local mode produces multiple agent sessions and ingests them sequentially', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'runq-agent-manager-'));
  const dbPath = join(dir, 'runq.db');
  const outDir = join(dir, 'artifacts');

  const result = await runAgentManager({
    mode: 'local',
    dbPath,
    outDir,
    agents: [
      { agentId: 'agent-success', scenario: 'verified-success' },
      { agentId: 'agent-failure', scenario: 'repeated-test-failure' }
    ],
    now: '2026-05-03T11:00:00.000Z'
  });

  assert.deepEqual(result.artifacts.map((artifact) => artifact.agentId).sort(), [
    'agent-failure',
    'agent-success'
  ]);
  assert.equal(result.ingested_events, 16);

  const sessions = getRunInboxSessions(dbPath);
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map((session) => session.satisfaction.label).sort(), [
    'abandoned',
    'accepted'
  ]);
  assert.equal(sessions.some((session) => session.quality.loop_risk === 0.8), true);
  assert.equal(sessions.some((session) => session.quality.outcome_confidence === 0.9), true);
});
