#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RunqStore } from './store.js';
import { scoreRun } from './scoring.js';
import { recommendRunImprovements } from './recommendations.js';
import { recordRecommendationFeedback } from './recommendation-feedback.js';
import { initAgent } from './init.js';
import { importOpenClawSessionFile } from './openclaw-session-import.js';
import { checkSetupHealth } from './doctor.js';
import { createReadinessReport } from './readiness.js';
import { createDemoDatabase } from './demo.js';

const runqRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseDbPath(args) {
  const dbIndex = args.indexOf('--db');
  if (dbIndex === -1 || !args[dbIndex + 1]) {
    return '.runq/runq.db';
  }
  return args[dbIndex + 1];
}

function stripOption(args, optionName) {
  const index = args.indexOf(optionName);
  if (index === -1) {
    return args;
  }
  return [
    ...args.slice(0, index),
    ...args.slice(index + 2)
  ];
}

function parseOption(args, optionName, fallback) {
  const index = args.indexOf(optionName);
  if (index === -1 || !args[index + 1]) {
    return fallback;
  }
  return args[index + 1];
}

function readEvents(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return [parsed];
}

function printUsage() {
  console.log(`RunQ CLI

Usage:
  runq demo --db <path>
  runq ingest <events.json> --db <path>
  runq init <all|claude-code|codex|openclaw|hermes> --db <path>
  runq doctor --db <path>
  runq import-openclaw <session.jsonl> --db <path>
  runq readiness --db <path>
  runq sessions --db <path>
  runq export <session_id> --db <path>
  runq accept-recommendation <session_id> <recommendation_id> [--note <text>] --db <path>
  runq dismiss-recommendation <session_id> <recommendation_id> [--note <text>] --db <path>
`);
}

export function main(argv = process.argv.slice(2)) {
  const [command] = argv;
  const dbPath = parseDbPath(argv);
  const args = stripOption(argv.slice(1), '--db');

  if (!command || command === 'help' || command === '--help') {
    printUsage();
    return 0;
  }

  if (command === 'ingest') {
    const [eventsPath] = args;
    if (!eventsPath) {
      console.error('Missing events file path');
      return 1;
    }

    const store = new RunqStore(dbPath);
    const events = readEvents(eventsPath);
    for (const event of events) {
      store.appendEvent(event);
    }
    store.close();
    console.log(`ingested ${events.length} events`);
    return 0;
  }

  if (command === 'demo') {
    try {
      const result = createDemoDatabase(dbPath);
      console.log(`created RunQ demo database at ${result.dbPath}`);
      console.log(`wrote ${result.event_count} events across ${result.session_ids.length} sessions`);
      console.log(`open it with: npm run inbox -- --db ${result.dbPath} --port 4545`);
      return 0;
    } catch (error) {
      console.error(error.message);
      return 1;
    }
  }

  if (command === 'init') {
    const [target] = args;
    if (!target) {
      console.error('Missing init target');
      return 1;
    }
    const homeDir = parseOption(argv, '--home', process.env.HOME);
    try {
      const result = initAgent(target, { homeDir, dbPath, runqRoot });
      const results = Array.isArray(result) ? result : [result];
      for (const item of results) {
        console.log(`configured ${item.target}: ${item.path}`);
      }
      return 0;
    } catch (error) {
      console.error(error.message);
      return 1;
    }
  }

  if (command === 'import-openclaw') {
    const [sessionPath] = args;
    if (!sessionPath) {
      console.error('Missing OpenClaw session jsonl path');
      return 1;
    }
    const events = importOpenClawSessionFile(sessionPath);
    const store = new RunqStore(dbPath);
    for (const event of events) {
      store.appendEvent(event);
    }
    store.close();
    console.log(`imported ${events.length} events from ${sessionPath}`);
    return 0;
  }

  if (command === 'doctor') {
    const homeDir = parseOption(argv, '--home', process.env.HOME);
    const health = checkSetupHealth({ homeDir, dbPath, runqRoot });
    if (argv.includes('--json')) {
      console.log(JSON.stringify(health, null, 2));
    } else {
      console.log(`RunQ setup health: ${health.ok ? 'ok' : 'needs attention'}`);
      for (const check of health.checks) {
        console.log(`- ${check.label}: ${check.status} - ${check.summary}`);
        if (check.status !== 'ok' && check.remediation) {
          console.log(`  Fix: ${check.remediation}`);
        }
      }
    }
    return 0;
  }

  if (command === 'sessions') {
    const store = new RunqStore(dbPath);
    const sessions = store.listSessions();
    store.close();
    console.log(JSON.stringify(sessions, null, 2));
    return 0;
  }

  if (command === 'readiness') {
    const report = createReadinessReport({ dbPath });
    if (argv.includes('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`RunQ v0.2 readiness: ${report.ready_for_public_preview ? 'ready' : 'not ready'}`);
      console.log(`- Sessions: ${report.sessions.total}`);
      console.log(`- Usable timelines: ${Math.round(report.sessions.usable_timeline_percent * 100)}% (${report.sessions.usable_timeline_count}/${report.sessions.total})`);
      console.log(`- Secret-like payload findings: ${report.redaction.secret_like_payload_findings.length}`);
    }
    return 0;
  }

  if (command === 'accept-recommendation' || command === 'dismiss-recommendation') {
    const [sessionId, recommendationId] = args;
    if (!sessionId || !recommendationId) {
      console.error('Usage: runq <accept-recommendation|dismiss-recommendation> <session_id> <recommendation_id> [--note <text>] --db <path>');
      return 1;
    }
    const note = parseOption(argv, '--note', null);
    const decision = command === 'accept-recommendation' ? 'accepted' : 'dismissed';
    const store = new RunqStore(dbPath);
    try {
      const event = recordRecommendationFeedback(store, { sessionId, recommendationId, decision, note });
      console.log(`${decision} ${recommendationId} for ${sessionId} (${event.event_id})`);
      return 0;
    } catch (error) {
      console.error(error.message);
      return 1;
    } finally {
      store.close();
    }
  }

  if (command === 'export') {
    const [sessionId] = args;
    if (!sessionId) {
      console.error('Missing session id');
      return 1;
    }

    const store = new RunqStore(dbPath);
    const events = store.listEventsForSession(sessionId);
    store.close();
    console.log(JSON.stringify({
      runq_version: '0.1.0',
      exported_at: new Date().toISOString(),
      session_id: sessionId,
      events,
      quality: scoreRun(events),
      recommendations: recommendRunImprovements(events)
    }, null, 2));
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  return 1;
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isEntrypoint) {
  process.exitCode = main();
}
