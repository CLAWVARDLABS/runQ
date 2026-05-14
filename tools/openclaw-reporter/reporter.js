#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { importOpenClawSessionFile } from '../../src/openclaw-session-import.js';
import { RunqStore } from '../../src/store.js';
import { getPrivacyMode } from '../../src/config.js';

function readJson(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function listSessionFiles(sessionsDir) {
  if (!existsSync(sessionsDir)) {
    return [];
  }
  return readdirSync(sessionsDir)
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => join(sessionsDir, name));
}

export function importNewOpenClawSessions({ sessionsDir, dbPath, statePath }) {
  const state = readJson(statePath, { imported: {} });
  state.imported = state.imported ?? {};
  const files = listSessionFiles(sessionsDir).filter((path) => !state.imported[path]);
  const store = new RunqStore(dbPath);
  const privacyMode = getPrivacyMode(dbPath);
  let importedEvents = 0;

  try {
    for (const file of files) {
      const events = importOpenClawSessionFile(file, privacyMode);
      for (const event of events) {
        store.appendEvent(event);
      }
      state.imported[file] = {
        imported_at: new Date().toISOString(),
        event_count: events.length
      };
      importedEvents += events.length;
    }
  } finally {
    store.close();
  }

  writeJson(statePath, state);
  return {
    imported_files: files.length,
    imported_events: importedEvents
  };
}

function parseArgs(argv) {
  const args = {
    sessionsDir: `${process.env.HOME}/.openclaw/agents/main/sessions`,
    dbPath: '.runq/runq.db',
    statePath: '.runq/openclaw-reporter-state.json',
    intervalMs: 5000,
    once: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--sessions') {
      args.sessionsDir = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--state') {
      args.statePath = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--interval-ms') {
      args.intervalMs = Number(argv[index + 1]);
      index += 1;
    } else if (argv[index] === '--once') {
      args.once = true;
    }
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const runOnce = () => {
    const result = importNewOpenClawSessions(args);
    console.log(JSON.stringify(result));
  };

  runOnce();
  if (args.once) {
    return 0;
  }

  setInterval(runOnce, args.intervalMs);
  return 0;
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isEntrypoint) {
  process.exitCode = main();
}
