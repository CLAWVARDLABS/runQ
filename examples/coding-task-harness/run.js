import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { RunqStore } from '../../src/store.js';
import { scoreRun } from '../../src/scoring.js';
import { recommendRunImprovements } from '../../src/recommendations.js';
import { eventId, hash } from '../../src/normalize-utils.js';

function parseArgs(argv) {
  const args = {
    now: new Date().toISOString()
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--repo') {
      args.repoDir = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--now') {
      args.now = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function timestamp(base, offsetSeconds) {
  return new Date(Date.parse(base) + offsetSeconds * 1000).toISOString();
}

function envelope({ eventType, timestamp: eventTimestamp, payload, source = 'hook' }) {
  const sessionId = 'coding-task-harness-bugfix';
  const runId = 'coding-task-harness-bugfix-run';
  return {
    runq_version: '0.1.0',
    event_id: eventId([sessionId, runId, eventType, eventTimestamp, JSON.stringify(payload)]),
    schema_version: '0.1.0',
    event_type: eventType,
    timestamp: eventTimestamp,
    session_id: sessionId,
    run_id: runId,
    framework: 'openclaw',
    source,
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload
  };
}

function ensureFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function createBrokenRepo(repoDir) {
  ensureFile(join(repoDir, 'src/cart.js'), `export function totalWithTax(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal;
}
`);
  ensureFile(join(repoDir, 'test/cart.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
import { totalWithTax } from '../src/cart.js';

test('coding task harness totalWithTax adds 10 percent tax', () => {
  assert.equal(totalWithTax([{ price: 50, quantity: 2 }]), 110);
});
`);
  ensureFile(join(repoDir, 'package.json'), `{"type":"module"}
`);
}

function applyBugfix(repoDir) {
  ensureFile(join(repoDir, 'src/cart.js'), `export function totalWithTax(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(subtotal * 1.1 * 100) / 100;
}
`);
}

function runVerification(repoDir) {
  const verificationScript = [
    "import assert from 'node:assert/strict';",
    "import { totalWithTax } from './src/cart.js';",
    "assert.equal(totalWithTax([{ price: 50, quantity: 2 }]), 110);",
    "console.log('cart verification passed');"
  ].join(' ');
  return spawnSync(process.execPath, ['--input-type=module', '-e', verificationScript], {
    cwd: repoDir,
    encoding: 'utf8'
  });
}

function commandEvents({ commandId, result, baseNow, offsetSeconds, repoDir }) {
  const argsHash = hash('node --input-type=module -e cart verification');
  const startedAt = timestamp(baseNow, offsetSeconds);
  const endedAt = timestamp(baseNow, offsetSeconds + 1);
  return [
    envelope({
      eventType: 'command.started',
      timestamp: startedAt,
      payload: {
        command_id: commandId,
        command_kind: 'shell',
        binary: 'node',
        args_hash: argsHash,
        cwd_hash: hash(repoDir),
        is_verification: true,
        verification_kind: 'test'
      }
    }),
    envelope({
      eventType: 'command.ended',
      timestamp: endedAt,
      payload: {
        command_id: commandId,
        command_kind: 'shell',
        binary: 'node',
        args_hash: argsHash,
        cwd_hash: hash(repoDir),
        exit_code: result.status,
        stdout_hash: hash(result.stdout ?? ''),
        stderr_hash: hash(result.stderr ?? ''),
        output_hash: hash(`${result.stdout ?? ''}${result.stderr ?? ''}`),
        duration_ms: 1000,
        is_verification: true,
        verification_kind: 'test'
      }
    })
  ];
}

function createEvents({ repoDir, now, firstResult, secondResult }) {
  const sessionId = 'coding-task-harness-bugfix';
  const runId = 'coding-task-harness-bugfix-run';
  return [
    envelope({
      eventType: 'session.started',
      timestamp: timestamp(now, 0),
      payload: {
        agent_name: 'coding-task-harness',
        session_key_hash: hash(sessionId)
      }
    }),
    envelope({
      eventType: 'user.prompt.submitted',
      timestamp: timestamp(now, 1),
      payload: {
        prompt_hash: hash('Fix totalWithTax so the failing tax test passes.'),
        prompt_summary: 'Fix totalWithTax so the failing tax test passes.',
        prompt_length: 47
      }
    }),
    ...commandEvents({
      commandId: 'baseline-failing-test',
      result: firstResult,
      baseNow: now,
      offsetSeconds: 2,
      repoDir
    }),
    envelope({
      eventType: 'file.changed',
      timestamp: timestamp(now, 4),
      source: 'filesystem_watcher',
      payload: {
        path_hash: hash('src/cart.js'),
        file_extension: 'js',
        change_kind: 'modified',
        lines_added: 1,
        lines_removed: 1
      }
    }),
    envelope({
      eventType: 'git.diff.summarized',
      timestamp: timestamp(now, 5),
      source: 'git_watcher',
      payload: {
        files_changed: 1,
        lines_added: 1,
        lines_removed: 1,
        touched_test_files: 0,
        summary: 'Applied 10 percent tax calculation in src/cart.js.'
      }
    }),
    ...commandEvents({
      commandId: 'post-fix-passing-test',
      result: secondResult,
      baseNow: now,
      offsetSeconds: 6,
      repoDir
    }),
    envelope({
      eventType: 'session.ended',
      timestamp: timestamp(now, 8),
      payload: {
        ended_reason: 'completed',
        duration_ms: 8000,
        message_count: 5
      }
    }),
    envelope({
      eventType: 'satisfaction.recorded',
      timestamp: timestamp(now, 9),
      source: 'manual',
      payload: {
        label: 'accepted',
        signal: 'failing test passed after code change',
        expected_user_judgment: 'The developer would likely accept the patch.'
      }
    })
  ];
}

export function runCodingTaskHarness({ dbPath, repoDir, now = new Date().toISOString() }) {
  if (!dbPath) {
    throw new Error('dbPath is required');
  }
  if (!repoDir) {
    throw new Error('repoDir is required');
  }

  createBrokenRepo(repoDir);
  const firstResult = runVerification(repoDir);
  applyBugfix(repoDir);
  const secondResult = runVerification(repoDir);
  const events = createEvents({ repoDir, now, firstResult, secondResult });

  const store = new RunqStore(dbPath);
  try {
    for (const event of events) {
      store.appendEvent(event);
    }
    const session = store.listSessions().find((candidate) => candidate.session_id === 'coding-task-harness-bugfix');
    const storedEvents = store.listEventsForSession('coding-task-harness-bugfix');
    return {
      session,
      events: storedEvents,
      commands: [firstResult, secondResult],
      quality: scoreRun(storedEvents),
      recommendations: recommendRunImprovements(storedEvents),
      satisfaction: {
        label: 'accepted',
        signal: 'failing test passed after code change'
      }
    };
  } finally {
    store.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dbPath || !args.repoDir) {
    console.error('Usage: node examples/coding-task-harness/run.js --db <runq.db> --repo <repo-dir> [--now <iso>]');
    process.exit(2);
  }

  const result = runCodingTaskHarness(args);
  console.log(JSON.stringify({
    session_id: result.session.session_id,
    framework: result.session.framework,
    event_count: result.events.length,
    commands: result.commands.map((command) => ({
      status: command.status,
      stdout_length: command.stdout.length,
      stderr_length: command.stderr.length
    })),
    satisfaction: result.satisfaction,
    quality: result.quality,
    recommendations: result.recommendations
  }, null, 2));
}
