import { RunqStore } from '../../src/store.js';
import { scoreRun } from '../../src/scoring.js';
import { recommendRunImprovements } from '../../src/recommendations.js';
import { eventId, hash } from '../../src/normalize-utils.js';
import { normalizeOpenClawEvent } from '../../adapters/openclaw/normalize.js';

function parseArgs(argv) {
  const args = {
    scenario: 'verified-success',
    now: new Date().toISOString()
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--scenario') {
      args.scenario = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
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

function fileChangedEvent({ sessionId, runId, path, now }) {
  return {
    runq_version: '0.1.0',
    event_id: eventId([sessionId, runId, 'file.changed', path, now]),
    schema_version: '0.1.0',
    event_type: 'file.changed',
    timestamp: now,
    session_id: sessionId,
    run_id: runId,
    framework: 'openclaw',
    source: 'filesystem_watcher',
    privacy: {
      level: 'metadata',
      redacted: true
    },
    payload: {
      path_hash: hash(path),
      file_extension: path.split('.').pop(),
      change_kind: 'modified'
    }
  };
}

function normalize(input, now) {
  return normalizeOpenClawEvent(input, { now });
}

function verifiedSuccessScenario(baseNow) {
  const sessionId = 'openclaw-harness-success';
  const runId = 'run-openclaw-harness-success';
  const ctx = {
    agentId: 'openclaw-devbot',
    sessionId,
    runId,
    workspaceDir: '/repo/app'
  };

  return [
    ...normalize({
      hook: 'session_start',
      event: { sessionId, sessionKey: 'local:success' },
      ctx
    }, timestamp(baseNow, 0)),
    ...normalize({
      hook: 'message_received',
      event: { from: 'developer', content: 'Fix the checkout total test and verify it.' },
      ctx
    }, timestamp(baseNow, 1)),
    ...normalize({
      hook: 'llm_input',
      event: {
        runId,
        sessionId,
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        prompt: 'Fix the checkout total test and verify it.',
        historyMessages: [],
        imagesCount: 0
      },
      ctx
    }, timestamp(baseNow, 2)),
    ...normalize({
      hook: 'llm_output',
      event: {
        runId,
        sessionId,
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        assistantTexts: ['I will patch the calculation and run the focused test.'],
        usage: { input: 900, output: 180, total: 1080 }
      },
      ctx
    }, timestamp(baseNow, 3)),
    fileChangedEvent({
      sessionId,
      runId,
      path: 'src/checkout/total.ts',
      now: timestamp(baseNow, 4)
    }),
    ...normalize({
      hook: 'after_tool_call',
      event: {
        toolName: 'system.run',
        toolCallId: 'test-success',
        runId,
        params: { command: 'pnpm test -- checkout-total.test.ts' },
        result: { exitCode: 0, stdout: '1 passed', stderr: '' },
        durationMs: 3200
      },
      ctx
    }, timestamp(baseNow, 5)),
    ...normalize({
      hook: 'session_end',
      event: { sessionId, sessionKey: 'local:success', messageCount: 7, durationMs: 6200 },
      ctx
    }, timestamp(baseNow, 6))
  ];
}

function repeatedFailureScenario(baseNow) {
  const sessionId = 'openclaw-harness-failure';
  const runId = 'run-openclaw-harness-failure';
  const ctx = {
    agentId: 'openclaw-devbot',
    sessionId,
    runId,
    workspaceDir: '/repo/app'
  };
  const failedTest = (toolCallId, offsetSeconds) => normalize({
    hook: 'after_tool_call',
    event: {
      toolName: 'system.run',
      toolCallId,
      runId,
      params: { command: 'pnpm test -- checkout-total.test.ts' },
      result: { exitCode: 1, stdout: '', stderr: 'expected 42 to equal 41' },
      durationMs: 2800
    },
    ctx
  }, timestamp(baseNow, offsetSeconds));

  return [
    ...normalize({
      hook: 'session_start',
      event: { sessionId, sessionKey: 'local:failure' },
      ctx
    }, timestamp(baseNow, 0)),
    ...normalize({
      hook: 'message_received',
      event: { from: 'developer', content: 'Fix the checkout total test.' },
      ctx
    }, timestamp(baseNow, 1)),
    fileChangedEvent({
      sessionId,
      runId,
      path: 'src/checkout/total.ts',
      now: timestamp(baseNow, 2)
    }),
    ...failedTest('test-failure-1', 3),
    ...failedTest('test-failure-2', 4),
    ...failedTest('test-failure-3', 5),
    ...normalize({
      hook: 'session_end',
      event: { sessionId, sessionKey: 'local:failure', messageCount: 8, durationMs: 7100 },
      ctx
    }, timestamp(baseNow, 6))
  ];
}

function scenarioEvents(scenario, now) {
  if (scenario === 'verified-success') {
    return verifiedSuccessScenario(now);
  }
  if (scenario === 'repeated-test-failure') {
    return repeatedFailureScenario(now);
  }
  throw new Error(`Unknown OpenClaw harness scenario: ${scenario}`);
}

export function runOpenClawHarness({ dbPath, scenario, now = new Date().toISOString() }) {
  if (!dbPath) {
    throw new Error('dbPath is required');
  }

  const store = new RunqStore(dbPath);
  const generatedEvents = scenarioEvents(scenario, now);

  try {
    for (const event of generatedEvents) {
      store.appendEvent(event);
    }

    const session = store.listSessions()[0];
    const events = store.listEventsForSession(session.session_id);
    return {
      session,
      events,
      quality: scoreRun(events),
      recommendations: recommendRunImprovements(events)
    };
  } finally {
    store.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dbPath) {
    console.error('Usage: node examples/openclaw-harness/run.js --scenario <name> --db <runq.db> [--now <iso>]');
    process.exit(2);
  }

  const result = runOpenClawHarness(args);
  console.log(JSON.stringify({
    session_id: result.session.session_id,
    framework: result.session.framework,
    event_count: result.events.length,
    quality: result.quality,
    recommendations: result.recommendations
  }, null, 2));
}
